import type { NextFunction } from 'express';
import { logger } from '../../logger/logger.js';
import { HtmlStatusCodes } from '../RsError.js';
import { resturaSchema } from '../schemas/resturaSchema.js';
import type { RsRequest, RsResponse } from '../types/customExpressTypes.js';
import { getRequestData } from '../validators/requestValidator.js';

export async function schemaValidation(req: RsRequest<unknown>, res: RsResponse<unknown>, next: NextFunction) {
	req.data = getRequestData(req as RsRequest<unknown>);

	try {
		resturaSchema.parse(req.data);
		next();
	} catch (error) {
		logger.error(error);
		res.sendError('BAD_REQUEST', error as string, HtmlStatusCodes.BAD_REQUEST);
	}
}
