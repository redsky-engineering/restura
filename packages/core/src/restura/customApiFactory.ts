import { fileUtils } from '@restura/internal';
import Bluebird from 'bluebird';
import fs from 'fs';
import path from 'path';
import { logger } from '../logger/logger.js';

class CustomApiFactory {
	private customApis: { [key: string]: { name: string } } = {};

	async loadApiFiles(baseFolderPath: string) {
		const apiVersions = ['v1'];
		for (const apiVersion of apiVersions) {
			const apiVersionFolderPath = path.join(baseFolderPath, apiVersion);

			const directoryExists = await fileUtils.existDir(apiVersionFolderPath);
			if (!directoryExists) continue;
			await this.addDirectory(apiVersionFolderPath, apiVersion);
		}
	}

	getCustomApi(customApiName: string): { name: string } {
		return this.customApis[customApiName];
	}

	private async addDirectory(directoryPath: string, apiVersion: string) {
		const entries = await fs.promises.readdir(directoryPath, {
			withFileTypes: true
		});
		const isTsx = process.argv[1]?.endsWith('.ts');
		const isTsNode = process.env.TS_NODE_DEV || process.env.TS_NODE_PROJECT;
		const extension = isTsx || isTsNode ? 'ts' : 'js';
		const shouldEndWith = `.api.${apiVersion}.${extension}`;
		await Bluebird.map(entries, async (entry) => {
			if (entry.isFile()) {
				if (entry.name.endsWith(shouldEndWith) === false) return;

				// The following try / catch block fixes an issue when looking for the map file giving an exception thrown
				try {
					const importPath = `${path.join(directoryPath, entry.name)}`;
					const ApiImport = await import(importPath);
					const customApiClass = new ApiImport.default();
					logger.info(`Registering custom API: ${ApiImport.default.name}`);
					this.bindMethodsToInstance(customApiClass);
					this.customApis[ApiImport.default.name] = customApiClass;
				} catch (e) {
					console.error(e);
				}
			}
		});
	}

	private bindMethodsToInstance<T extends object>(instance: T): void {
		const proto = Object.getPrototypeOf(instance);
		Object.getOwnPropertyNames(proto).forEach((key) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const property = (instance as any)[key]; // Temporarily cast for property access
			if (typeof property === 'function' && key !== 'constructor') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(instance as any)[key] = property.bind(instance); // Temporarily cast for binding
			}
		});
	}
}

const customApiFactory = new CustomApiFactory();
export default customApiFactory;
