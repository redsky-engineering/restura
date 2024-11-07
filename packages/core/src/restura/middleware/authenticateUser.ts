import type { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/customExpress.types.js';
import type { AuthenticateHandler, AuthenticationUserDetails } from '../types/restura.types.js';

export function authenticateUser(applicationAuthenticateHandler: AuthenticateHandler) {
	return (req: RsRequest, res: RsResponse, next: NextFunction) => {
		// Call the custom function from the main application and get the role and other details
		applicationAuthenticateHandler(req, res, (userDetails: AuthenticationUserDetails) => {
			req.requesterDetails = { host: req.hostname, ipAddress: req.ip || '', ...userDetails };
			next();
		});
	};
}
