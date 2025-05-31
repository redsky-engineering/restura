import type { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/customExpressTypes.js';
import type { AuthenticateHandler, AuthenticatedRequesterDetails } from '../types/resturaTypes.js';

export function authenticateRequester(applicationAuthenticateHandler: AuthenticateHandler) {
	return (req: RsRequest, res: RsResponse, next: NextFunction) => {
		// Call the custom function from the main application and get the role and other details
		applicationAuthenticateHandler(req, res, (authenticatedRequesterDetails: AuthenticatedRequesterDetails) => {
			req.requesterDetails = { host: req.hostname, ipAddress: req.ip || '', ...authenticatedRequesterDetails };
			next();
		});
	};
}
