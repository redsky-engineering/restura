import { loadConfigFile } from '@restura/internal';

export async function init(): Promise<object> {
	console.log('Loading config files...');
	return await loadConfigFile();
}
