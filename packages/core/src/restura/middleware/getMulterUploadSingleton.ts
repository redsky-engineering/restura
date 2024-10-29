import multer from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import * as os from 'os';

const OneHundredMB = 100 * 1024 * 1024;
let commonUpload = null;
export const getMulterUploadSingleton = (directory?: string) => {
	if (commonUpload) return commonUpload;
	const storage = multer.diskStorage({
		destination: directory || os.tmpdir(),
		filename: function (request: Request, file: Express.Multer.File, cb: (err: unknown, success: string) => void) {
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
