import k8sClient from '../k8s-client';
import helmClient from '../helm-client';
import prisma from '../db';
import logger from '../logger';

export interface DeleteStoreParams {
    storeId: string;
    namespace: string;
}

export async function deleteStore(params: DeleteStoreParams): Promise<void> {
    const { storeId, namespace } = params;

    try {
        logger.info(`Starting deletion of store ${storeId} in namespace ${namespace}`);

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'DELETION_STARTED',
                message: 'Starting store deletion',
            },
        });

        // Step 1: Uninstall Helm release
        const storeName = namespace.replace('store-', '');
        const releaseName = `store-${storeName}`;

        try {
            logger.info(`Uninstalling Helm release ${releaseName}`);
            await helmClient.uninstall(releaseName, namespace);

            await prisma.provisioningEvent.create({
                data: {
                    storeId,
                    event: 'HELM_RELEASE_UNINSTALLED',
                    message: 'Helm release uninstalled',
                },
            });
        } catch (error: any) {
            logger.warn(`Failed to uninstall Helm release: ${error.message}`);
        }

        // Step 2: Delete namespace (this will delete all resources including PVCs)
        logger.info(`Deleting namespace ${namespace}`);
        await k8sClient.deleteNamespace(namespace);

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'NAMESPACE_DELETED',
                message: 'Namespace and all resources deleted',
            },
        });

        // Step 3: Delete store record from database
        logger.info(`Deleting store ${storeId} from database`);
        await prisma.store.delete({
            where: { id: storeId },
        });

        logger.info(`Store ${storeId} deleted successfully`);
    } catch (error: any) {
        logger.error(`Failed to delete store ${storeId}:`, error);

        await prisma.store.update({
            where: { id: storeId },
            data: {
                status: 'FAILED',
                failureReason: `Deletion failed: ${error.message}`,
            },
        });

        await prisma.provisioningEvent.create({
            data: {
                storeId,
                event: 'DELETION_FAILED',
                message: `Deletion failed: ${error.message}`,
            },
        });

        throw error;
    }
}
