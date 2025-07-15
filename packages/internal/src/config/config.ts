import * as path from 'path';
import type { z } from 'zod';

export class Config {
	private configData: { [key: string]: unknown } | null = null;

	public get config() {
		return this.configData;
	}

	public async validate<T extends z.ZodType>(domain: string, schema: T): Promise<z.infer<T>> {
		if (!this.configData) {
			await this.load();
		}

		if (!this.configData || typeof this.configData !== 'object' || !(domain in this.configData)) {
			console.error(`Config \"${domain}\" not found`);
			throw new Error(`Invalid Restura Configuration`);
		}

		const result = schema.safeParse(this.configData[domain]);

		if (!result.success) {
			const errorDetails = result.error.issues
				.map((issue) => `Path: ${issue.path.join('.')}, Message: ${issue.message}`)
				.join('; ');

			console.error(`Validation failed for config \"${domain}\": ${errorDetails}`);
			throw new Error(`Invalid Restura Configuration`);
		}

		return result.data;
	}

	private async load() {
		try {
			const configPath = path.join(process.cwd(), 'restura.config.mjs');
			const configModule = await import(configPath);
			this.configData = configModule.default;
		} catch (error) {
			console.error('FATAL: Failed to load restura.config.mjs, restura will not start!!!');
			console.error(error);
			process.exit(1);
		}
	}
}

const config = new Config();
export { config };
