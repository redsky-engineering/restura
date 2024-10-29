import multer from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import tempCache from '../utils/tempCache.js';

const storage = multer.diskStorage({
	destination: tempCache.location,
	filename: function (request: Request, file: Express.Multer.File, cb: (err: unknown, success: string) => void) {
		const extension = extname(file.originalname);
		const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1000);
		cb(null, `${uniqueName}${extension}`);
	}
});

const OneHundredMB = 100 * 1024 * 1024;
const multerCommonUpload = multer({
	storage,
	limits: {
		fileSize: OneHundredMB
	}
});

export default multerCommonUpload;
