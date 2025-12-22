import { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/customExpressTypes.js';

export default function addDeprecationResponse(req: RsRequest<unknown>, res: RsResponse<unknown>, next: NextFunction) {
	const deprecation = req.routeData?.deprecation;
	if (deprecation) {
		const date =
			deprecation.date instanceof Date ? deprecation.date : new Date(deprecation.date as unknown as string);
		if (!Number.isNaN(date.getTime())) {
			res.set('Deprecation', date.toUTCString());
		}
		res.set(
			'Deprecation-Message',
			deprecation.message ?? 'This endpoint is deprecated and will be removed in the future.'
		);
	}
	next();
}
