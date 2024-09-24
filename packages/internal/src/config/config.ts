import * as fs from 'fs';
import JSON5 from 'json5';
import * as path from 'path';
import { ZodSchema } from 'zod';

export class Config {
	private configData: { [key: string]: unknown } | null = null;

	public get config() {
		return this.configData;
	}

	public validate<T>(domain: string, schema: ZodSchema<T>): T {
		if (!this.configData) {
			this.load();
		}

		if (!this.configData || typeof this.configData !== 'object' || !(domain in this.configData)) {
			console.error(`Config \"${domain}\" not found`);
			throw new Error(`Invalid Restura Configuration`);
		}

		const result = schema.safeParse(this.configData[domain]);

		if (!result.success) {
			const errorDetails = result.error.errors
				.map((e) => `Path: ${e.path.join('.')}, Message: ${e.message}`)
				.join('; ');

			console.error(`Validation failed for config \"${domain}\": ${errorDetails}`);
			throw new Error(`Invalid Restura Configuration`);
		}

		return result.data;
	}

	private load() {
		const content = fs.readFileSync(path.join(process.cwd(), 'config.json5'), { encoding: 'utf8' });
		this.configData = JSON5.parse(content);
	}
}

const config = new Config();
export { config };
