import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger';

const execAsync = promisify(exec);

class HelmClient {
    private helmBinary: string;
    private chartsPath: string;

    constructor() {
        this.helmBinary = process.env.HELM_BINARY || 'helm';
        this.chartsPath = process.env.HELM_CHARTS_PATH || '../helm';
    }

    async install(
        releaseName: string,
        chartName: string,
        namespace: string,
        values: Record<string, any> = {},
        wait: boolean = true
    ): Promise<void> {
        const chartPath = `${this.chartsPath}/${chartName}`;
        const valuesJson = JSON.stringify(values);

        let command = `${this.helmBinary} install ${releaseName} ${chartPath} --namespace ${namespace} --create-namespace`;

        if (Object.keys(values).length > 0) {
            // Write values to temp file
            const { writeFile } = await import('fs/promises');
            const { tmpdir } = await import('os');
            const valuesFile = `${tmpdir()}\\helm-values-${releaseName}.json`;
            await writeFile(valuesFile, valuesJson);
            command += ` --values ${valuesFile}`;
        }

        if (wait) {
            command += ' --wait --timeout 10m';
        }

        try {
            logger.info(`Installing Helm release: ${releaseName}`);

            // Set environment for helm subprocess to include kubectl
            const env = {
                ...process.env,
                KUBECONFIG: process.env.KUBECONFIG || `${process.env.USERPROFILE}\\.kube\\config`,
                PATH: `${process.env.USERPROFILE}\\.k8s-tools;${process.env.PATH}`,
            };

            const { stdout, stderr } = await execAsync(command, { env });

            if (stdout) logger.info(`Helm install stdout: ${stdout}`);
            if (stderr) logger.warn(`Helm install stderr: ${stderr}`);

            logger.info(`Helm release ${releaseName} installed successfully`);
        } catch (error: any) {
            logger.error(`Helm install failed: ${error.message}`);
            throw error;
        }
    }

    async uninstall(releaseName: string, namespace: string): Promise<void> {
        const command = `${this.helmBinary} uninstall ${releaseName} --namespace ${namespace}`;

        try {
            logger.info(`Uninstalling Helm release: ${releaseName}`);
            const { stdout, stderr } = await execAsync(command);

            if (stdout) logger.info(`Helm uninstall stdout: ${stdout}`);
            if (stderr) logger.warn(`Helm uninstall stderr: ${stderr}`);

            logger.info(`Helm release ${releaseName} uninstalled successfully`);
        } catch (error: any) {
            if (error.message.includes('not found')) {
                logger.info(`Helm release ${releaseName} not found`);
            } else {
                logger.error(`Helm uninstall failed: ${error.message}`);
                throw error;
            }
        }
    }

    async status(releaseName: string, namespace: string): Promise<string> {
        const command = `${this.helmBinary} status ${releaseName} --namespace ${namespace} -o json`;

        try {
            const { stdout } = await execAsync(command);
            return stdout;
        } catch (error: any) {
            logger.error(`Helm status failed: ${error.message}`);
            throw error;
        }
    }

    async list(namespace?: string): Promise<any[]> {
        let command = `${this.helmBinary} list -o json`;

        if (namespace) {
            command += ` --namespace ${namespace}`;
        } else {
            command += ' --all-namespaces';
        }

        try {
            const { stdout } = await execAsync(command);
            return JSON.parse(stdout);
        } catch (error: any) {
            logger.error(`Helm list failed: ${error.message}`);
            throw error;
        }
    }
}

export default new HelmClient();
