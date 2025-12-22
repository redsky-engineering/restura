import { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/customExpressTypes.js';

export default function addDeprecationResponse(req: RsRequest<unknown>, res: RsResponse<unknown>, next: NextFunction) {
	const deprecation = req.routeData?.deprecation;
	if (deprecation) {
		const { date, message } = deprecation;
		const dateObject = new Date(date);
		res.set('Deprecation', `@${dateObject.getTime().toString()}`);
		res.set('Deprecation-Message', message ?? 'This endpoint is deprecated and will be removed in the future.');
	}
	next();
}
