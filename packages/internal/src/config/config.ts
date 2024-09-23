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
			throw new Error(`Config ${domain} not found`);
		}

		return schema.parse(this.configData[domain]);
	}

	private load() {
		const content = fs.readFileSync(path.join(process.cwd(), 'config.json5'), { encoding: 'utf8' });
		this.configData = JSON5.parse(content);
	}
}

const config = new Config();
export { config };
