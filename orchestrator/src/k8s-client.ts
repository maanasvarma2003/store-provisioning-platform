import * as k8s from '@kubernetes/client-node';
import logger from './logger';

class KubernetesClient {
    private kc: k8s.KubeConfig;
    public coreApi: k8s.CoreV1Api;
    public appsApi: k8s.AppsV1Api;
    public networkingApi: k8s.NetworkingV1Api;
    public rbacApi: k8s.RbacAuthorizationV1Api;

    constructor() {
        this.kc = new k8s.KubeConfig();

        if (process.env.IN_CLUSTER === 'true') {
            logger.info('Loading in-cluster Kubernetes config');
            this.kc.loadFromCluster();
        } else {
            logger.info('Loading Kubernetes config from file');
            this.kc.loadFromDefault();
        }

        this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
        this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
        this.rbacApi = this.kc.makeApiClient(k8s.RbacAuthorizationV1Api);
    }

    async createNamespace(name: string, labels: Record<string, string> = {}): Promise<void> {
        const namespace: k8s.V1Namespace = {
            metadata: {
                name,
                labels: {
                    'app.kubernetes.io/managed-by': 'store-platform',
                    ...labels,
                },
            },
        };

        try {
            await this.coreApi.createNamespace(namespace);
            logger.info(`Namespace ${name} created`);
        } catch (error: any) {
            if (error.response?.statusCode === 409) {
                logger.info(`Namespace ${name} already exists`);
            } else {
                throw error;
            }
        }
    }

    async deleteNamespace(name: string): Promise<void> {
        try {
            await this.coreApi.deleteNamespace(name);
            logger.info(`Namespace ${name} deleted`);
        } catch (error: any) {
            if (error.response?.statusCode === 404) {
                logger.info(`Namespace ${name} not found`);
            } else {
                throw error;
            }
        }
    }

    async createResourceQuota(namespace: string, name: string, hard: Record<string, string>): Promise<void> {
        const quota: k8s.V1ResourceQuota = {
            metadata: { name },
            spec: { hard },
        };

        try {
            await this.coreApi.createNamespacedResourceQuota(namespace, quota);
            logger.info(`ResourceQuota ${name} created in namespace ${namespace}`);
        } catch (error: any) {
            if (error.response?.statusCode === 409) {
                logger.info(`ResourceQuota ${name} already exists`);
            } else {
                throw error;
            }
        }
    }

    async createLimitRange(namespace: string, name: string, limits: k8s.V1LimitRangeItem[]): Promise<void> {
        const limitRange: k8s.V1LimitRange = {
            metadata: { name },
            spec: { limits },
        };

        try {
            await this.coreApi.createNamespacedLimitRange(namespace, limitRange);
            logger.info(`LimitRange ${name} created in namespace ${namespace}`);
        } catch (error: any) {
            if (error.response?.statusCode === 409) {
                logger.info(`LimitRange ${name} already exists`);
            } else {
                throw error;
            }
        }
    }

    async createSecret(
        namespace: string,
        name: string,
        data: Record<string, string>,
        type: string = 'Opaque'
    ): Promise<void> {
        const secret: k8s.V1Secret = {
            metadata: { name },
            type,
            stringData: data,
        };

        try {
            await this.coreApi.createNamespacedSecret(namespace, secret);
            logger.info(`Secret ${name} created in namespace ${namespace}`);
        } catch (error: any) {
            if (error.response?.statusCode === 409) {
                logger.info(`Secret ${name} already exists`);
            } else {
                throw error;
            }
        }
    }

    async createNetworkPolicy(namespace: string, policy: k8s.V1NetworkPolicy): Promise<void> {
        try {
            await this.networkingApi.createNamespacedNetworkPolicy(namespace, policy);
            logger.info(`NetworkPolicy ${policy.metadata?.name} created in namespace ${namespace}`);
        } catch (error: any) {
            if (error.response?.statusCode === 409) {
                logger.info(`NetworkPolicy ${policy.metadata?.name} already exists`);
            } else {
                throw error;
            }
        }
    }

    async waitForPodsReady(namespace: string, labelSelector: string, timeoutMs: number = 300000): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            try {
                const response = await this.coreApi.listNamespacedPod(
                    namespace,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    labelSelector
                );

                const pods = response.body.items;

                if (pods.length === 0) {
                    logger.debug(`No pods found with selector ${labelSelector} in namespace ${namespace}`);
                    await this.sleep(5000);
                    continue;
                }

                const allReady = pods.every(pod => {
                    const conditions = pod.status?.conditions || [];
                    const readyCondition = conditions.find(c => c.type === 'Ready');
                    return readyCondition?.status === 'True';
                });

                if (allReady) {
                    logger.info(`All pods ready in namespace ${namespace}`);
                    return true;
                }

                logger.debug(`Waiting for pods to be ready in namespace ${namespace}...`);
                await this.sleep(5000);
            } catch (error) {
                logger.error('Error checking pod status:', error);
                await this.sleep(5000);
            }
        }

        logger.error(`Timeout waiting for pods in namespace ${namespace}`);
        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default new KubernetesClient();
