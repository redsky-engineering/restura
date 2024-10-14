import fs from 'fs';
import path from 'path';
import { logger } from '../logger/logger.js';

export interface ICustomApi {
	name: string;
}

class CustomApiFactory {
	private customApis: { [key: string]: ICustomApi } = {};

	async loadApiFiles(baseFolderPath: string) {
		const apiVersions = ['v1'];
		for (const apiVersion of apiVersions) {
			const apiVersionFolderPath = path.join(baseFolderPath, apiVersion);
			if (!fs.existsSync(apiVersionFolderPath)) continue;

			await this.addDirectory(apiVersionFolderPath, apiVersion);
		}
	}

	getCustomApi(customApiName: string): ICustomApi {
		return this.customApis[customApiName];
	}

	private async addDirectory(directoryPath: string, apiVersion: string) {
		const entries = fs.readdirSync(directoryPath, {
			withFileTypes: true
		});

		for (const entry of entries) {
			if (entry.isFile()) {
				if (entry.name.endsWith(`.api.${apiVersion}.js`) === false) continue;

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
		}
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
