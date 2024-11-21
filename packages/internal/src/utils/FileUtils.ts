import fs from 'fs';

export class FileUtils {
	static async ensureDir(path: string) {
		const exists = await FileUtils.existDir(path);
		if (!exists) {
			await fs.promises.mkdir(path);
		}
	}

	static async existDir(path: string) {
		const dir = await fs.promises.readdir(path).catch(() => Promise.resolve(null));
		return !!dir;
	}
}
