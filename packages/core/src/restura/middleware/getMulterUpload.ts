import { Request } from 'express';
import multer from 'multer';
import * as os from 'os';
import { extname } from 'path';

const OneHundredMB = 100 * 1024 * 1024;
let commonUpload: multer.Multer | null = null;
export const getMulterUpload = (directory?: string) => {
	if (commonUpload) return commonUpload;
	const storage = multer.diskStorage({
		destination: directory || os.tmpdir(),
		filename: function (
			request: Request,
			file: Express.Multer.File,
			cb: (err: Error | null, success: string) => void
		) {
			const extension = extname(file.originalname);
			const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1000);
			cb(null, `${uniqueName}${extension}`);
		}
	});

	commonUpload = multer({
		storage,
		limits: {
			fileSize: OneHundredMB
		}
	});
	return commonUpload;
};
