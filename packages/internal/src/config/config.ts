import * as fs from 'fs';
import JSON5 from 'json5';
import * as path from 'path';
import { ZodSchema } from 'zod';

export class Config {
	private configData: unknown | null = null;

	public get config() {
		return this.configData;
	}

	public validate<T>(schema: ZodSchema<T>): T {
		if (!this.configData) {
			this.load();
		}

		return schema.parse(this.configData);
	}

	private load() {
		const content = fs.readFileSync(path.join(process.cwd(), 'config.json5'), { encoding: 'utf8' });
		this.configData = JSON5.parse(content);
	}
}

const config = new Config();
export { config };
