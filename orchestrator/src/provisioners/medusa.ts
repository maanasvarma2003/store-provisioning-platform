import k8sClient from '../k8s-client';
import helmClient from '../helm-client';
import prisma from '../db';
import logger from '../logger';
import * as crypto from 'crypto';

export interface ProvisionMedusaParams {
    storeId: string;
    storeName: string;
    namespace: string;
}

export async function provisionMedusa(params: ProvisionMedusaParams): Promise<void> {
    const { storeId, storeName, namespace } = params;
    const baseDomain = process.env.BASE_DOMAIN || '127.0.0.1.nip.io';
    const storeUrl = `http://${storeName}.${baseDomain}`;
    const adminUrl = `http://${storeName}-admin.${baseDomain}`;
    const backendUrl = `http://${storeName}-backend.${baseDomain}`;

    try {
        // Log event
        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'PROVISIONING_STARTED',
                message: 'Starting Medusa provisioning',
            },
        });

        // Step 1: Create namespace
        logger.info(`Creating namespace ${namespace}`);
        await k8sClient.createNamespace(namespace, {
            'store-id': storeId,
            'store-name': storeName,
            'engine': 'medusa',
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
            'requests.cpu': process.env.DEFAULT_CPU_LIMIT || '3',
            'requests.memory': process.env.DEFAULT_MEMORY_LIMIT || '6Gi',
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
        const postgresPassword = crypto.randomBytes(16).toString('hex');
        const redisPassword = crypto.randomBytes(16).toString('hex');
        const adminPassword = crypto.randomBytes(12).toString('hex');
        const jwtSecret = crypto.randomBytes(32).toString('hex');
        const cookieSecret = crypto.randomBytes(32).toString('hex');

        await k8sClient.createSecret(namespace, 'postgres-credentials', {
            'postgres-password': postgresPassword,
        });

        await k8sClient.createSecret(namespace, 'redis-credentials', {
            'redis-password': redisPassword,
        });

        await k8sClient.createSecret(namespace, 'medusa-secrets', {
            'admin-password': adminPassword,
            'jwt-secret': jwtSecret,
            'cookie-secret': cookieSecret,
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'SECRETS_CREATED',
                message: 'PostgreSQL, Redis and Medusa secrets created',
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
        logger.info(`Installing Medusa Helm chart for ${namespace}`);
        const helmValues = {
            storeName,
            domain: baseDomain,
            storageClass: 'standard',
            postgresql: {
                database: 'medusa',
                user: 'medusa',
            },
            redis: {
                enabled: true,
            },
            medusa: {
                adminEmail: `admin@${storeName}.local`,
                adminPassword: adminPassword,
            },
        };

        await helmClient.install(
            `store-${storeName}`,
            'medusa-store',
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
            parseInt(process.env.PROVISIONING_TIMEOUT_MS || '900000') // 15 minutes for Medusa
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
                adminUser: 'admin@' + storeName + '.local',
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
                    backendUrl,
                    adminEmail: 'admin@' + storeName + '.local',
                },
            },
        });

        logger.info(`Medusa store ${storeName} provisioned successfully`);
    } catch (error: any) {
        logger.error(`Failed to provision Medusa store ${storeName}:`, error);

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
