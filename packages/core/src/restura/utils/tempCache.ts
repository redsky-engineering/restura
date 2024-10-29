import fs from 'fs';
import path from 'path';

import { DateUtils } from '@redskytech/core-utils';
import { logger } from '../../logger/logger.js';
import Bluebird from 'bluebird';
import * as os from 'os';

// TODO: this is not working. neither __dirname or import.meta.url are populated
// we may need "type": "module" in package.json
// console.log('__dirname:', __dirname);
// console.log('import.meta.url:', import.meta.url);
// const __filename = fileURLToPath(import.meta.url);
// console.log('__filename:', __filename);
// const __dirname = path.dirname(__filename);

class TempCache {
	// location = path.join(__dirname, '../../../temp-cache'); TODO: support this path again
	location: string;
	private readonly maxDurationDays = 7;

	constructor(location?: string) {
		this.location = location || os.tmpdir();
		fs.promises.readdir(this.location).catch((e) => {
			throw e;
		});
	}

	async cleanup() {
		const fileList = await fs.promises.readdir(this.location);
		await Bluebird.map(
			fileList,
			async (file) => {
				const fullFilePath = path.join(this.location, file);
				const fileStats = await fs.promises.stat(fullFilePath);
				if (
					DateUtils.daysBetweenStartAndEndDates(new Date(fileStats.mtimeMs), new Date()) >
					this.maxDurationDays
				) {
					logger.info(`Deleting old temp file: ${file}`);
					await fs.promises.unlink(fullFilePath);
				}
			},
			{ concurrency: 10 }
		);
	}
}
const tempCache = new TempCache();
export default tempCache;
