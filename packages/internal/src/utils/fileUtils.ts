import fs from 'fs';
import { boundMethod } from 'autobind-decorator';

class FileUtils {
	@boundMethod
	async ensureDir(path: string) {
		const exists = await this.existDir(path);
		if (!exists) {
			await fs.promises.mkdir(path);
		}
	}

	@boundMethod
	async existDir(path: string) {
		const dir = await fs.promises.readdir(path).catch(() => Promise.resolve(null));
		return !!dir;
	}
}

export const fileUtils = new FileUtils();
