import type { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/expressCustom.js';
import { getRequestData } from '../validateRequestParams.js';
import { logger } from '../../logger/logger.js';
import { HtmlStatusCodes } from '../errors.js';
import { resturaZodSchema } from '../restura.schema.js';

export async function schemaValidation(req: RsRequest<unknown>, res: RsResponse<unknown>, next: NextFunction) {
	req.data = getRequestData(req as RsRequest<unknown>);

	try {
		resturaZodSchema.parse(req.data);
		next();
	} catch (error) {
		logger.error(error);
		res.sendError('BAD_REQUEST', error as string, HtmlStatusCodes.BAD_REQUEST);
	}
}
