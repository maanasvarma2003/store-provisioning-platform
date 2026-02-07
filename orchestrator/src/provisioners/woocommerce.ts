import k8sClient from '../k8s-client';
import helmClient from '../helm-client';
import prisma from '../db';
import logger from '../logger';
import * as crypto from 'crypto';

export interface ProvisionWooCommerceParams {
    storeId: string;
    storeName: string;
    namespace: string;
}

export async function provisionWooCommerce(params: ProvisionWooCommerceParams): Promise<void> {
    const { storeId, storeName, namespace } = params;
    const baseDomain = process.env.BASE_DOMAIN || '127.0.0.1.nip.io';
    const storeUrl = `http://${storeName}.${baseDomain}`;
    const adminUrl = `${storeUrl}/wp-admin`;

    try {
        // Log event
        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'PROVISIONING_STARTED',
                message: 'Starting WooCommerce provisioning',
            },
        });

        // Step 1: Create namespace
        logger.info(`Creating namespace ${namespace}`);
        await k8sClient.createNamespace(namespace, {
            'store-id': storeId,
            'store-name': storeName,
            'engine': 'woocommerce',
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'NAMESPACE_CREATED',
                message: `Namespace ${namespace} created`,
            },
        });

        // Step 2: Apply ResourceQuota
        logger.info(`Creating ResourceQuota for ${namespace}`);
        await k8sClient.createResourceQuota(namespace, 'store-quota', {
            'requests.cpu': process.env.DEFAULT_CPU_LIMIT || '2',
            'requests.memory': process.env.DEFAULT_MEMORY_LIMIT || '4Gi',
            'persistentvolumeclaims': '5',
            'requests.storage': process.env.DEFAULT_STORAGE_LIMIT || '10Gi',
        });

        // Step 3: Apply LimitRange
        logger.info(`Creating LimitRange for ${namespace}`);
        await k8sClient.createLimitRange(namespace, 'store-limits', [
            {
                type: 'Container',
                _default: {
                    cpu: '500m',
                    memory: '512Mi',
                },
                defaultRequest: {
                    cpu: '100m',
                    memory: '256Mi',
                },
            },
        ]);

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'QUOTAS_APPLIED',
                message: 'ResourceQuota and LimitRange applied',
            },
        });

        // Step 4: Create secrets
        logger.info(`Creating secrets for ${namespace}`);
        const dbPassword = crypto.randomBytes(16).toString('hex');
        const adminPassword = crypto.randomBytes(12).toString('hex');

        await k8sClient.createSecret(namespace, 'mysql-credentials', {
            'mysql-root-password': dbPassword,
            'mysql-password': dbPassword,
        });

        await k8sClient.createSecret(namespace, 'wordpress-credentials', {
            'admin-password': adminPassword,
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'SECRETS_CREATED',
                message: 'Database and WordPress secrets created',
            },
        });

        // Step 5: Apply NetworkPolicy
        logger.info(`Creating NetworkPolicy for ${namespace}`);
        await k8sClient.createNetworkPolicy(namespace, {
            metadata: {
                name: 'store-network-policy',
            },
            spec: {
                podSelector: {},
                policyTypes: ['Ingress'],
                ingress: [
                    {
                        from: [
                            {
                                namespaceSelector: {
                                    matchLabels: {
                                        'app.kubernetes.io/name': 'ingress-nginx',
                                    },
                                },
                            },
                        ],
                    },
                    {
                        from: [
                            {
                                podSelector: {},
                            },
                        ],
                    },
                ],
            },
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'NETWORK_POLICY_APPLIED',
                message: 'NetworkPolicy applied',
            },
        });

        // Step 6: Install Helm chart
        logger.info(`Installing WooCommerce Helm chart for ${namespace}`);
        const helmValues = {
            storeName,
            domain: baseDomain,
            storageClass: 'standard',
            wordpress: {
                adminUser: 'admin',
                adminEmail: `admin@${storeName}.local`,
                siteTitle: storeName,
            },
            mysql: {
                database: 'wordpress',
                user: 'wordpress',
            },
        };

        await helmClient.install(
            `store-${storeName}`,
            'wordpress-store',
            namespace,
            helmValues,
            true
        );

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'HELM_RELEASE_INSTALLED',
                message: 'Helm release installed',
            },
        });

        // Step 7: Wait for pods to be ready
        logger.info(`Waiting for pods to be ready in ${namespace}`);
        const ready = await k8sClient.waitForPodsReady(
            namespace,
            'app.kubernetes.io/instance=store-' + storeName,
            parseInt(process.env.PROVISIONING_TIMEOUT_MS || '600000')
        );

        if (!ready) {
            throw new Error('Timeout waiting for pods to be ready');
        }

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'PODS_READY',
                message: 'All pods are ready',
            },
        });

        // Step 8: Update store status
        logger.info(`Updating store ${storeId} status to READY`);
        await prisma.store.update({
            where: { id: storeId },
            data: {
                status: 'READY',
                url: storeUrl,
                adminUrl,
                adminUser: 'admin',
                adminPass: adminPassword,
            },
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'PROVISIONING_COMPLETED',
                message: `Store is ready at ${storeUrl}`,
                metadata: {
                    storeUrl,
                    adminUrl,
                    adminUser: 'admin',
                },
            },
        });

        logger.info(`WooCommerce store ${storeName} provisioned successfully`);
    } catch (error: any) {
        logger.error(`Failed to provision WooCommerce store ${storeName}:`, error);

        await prisma.store.update({
            where: { id: storeId },
            data: {
                status: 'FAILED',
                failureReason: error.message,
            },
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'PROVISIONING_FAILED',
                message: `Provisioning failed: ${error.message}`,
            },
        });

        throw error;
    }
}
