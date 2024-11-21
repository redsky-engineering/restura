import fs from 'fs';
import path from 'path';

import { DateUtils } from '@redskytech/core-utils';
import { FileUtils } from '@restura/internal';
import Bluebird from 'bluebird';
import * as os from 'os';
import { logger } from '../../logger/logger.js';

export default class TempCache {
	location: string;
	private readonly maxDurationDays = 7;

	constructor(location?: string) {
		this.location = location || os.tmpdir();
		FileUtils.ensureDir(this.location).catch((e) => {
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
