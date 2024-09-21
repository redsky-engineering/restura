import { loadConfigFile } from '@restura/internal';

export async function init(): Promise<object> {
	return await loadConfigFile();
}
