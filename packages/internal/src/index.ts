import { readFile } from 'fs/promises';
import JSON5 from 'json5';
import * as path from 'path';

/**
 * Asynchronously loads and parses a JSON5 configuration file. Throws an error if the file does not exist.
 * @returns {Promise<object>} A promise that resolves to the parsed configuration object.
 */
export async function loadConfigFile(): Promise<object> {
	const content = await readFile(path.join(process.cwd(), 'config.json5'), { encoding: 'utf8' });
	const parsedData = JSON5.parse(content);
	return parsedData;
}
