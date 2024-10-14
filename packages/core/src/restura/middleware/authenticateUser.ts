import type { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/expressCustom.js';
import type { AuthenticateHandler, AuthenticationUserDetails } from '../types/restura.types.js';

export function authenticateUser(applicationAuthenticateHandler: AuthenticateHandler) {
	return (req: RsRequest, res: RsResponse, next: NextFunction) => {
		// Call the custom function from the main application
		applicationAuthenticateHandler(req, res, (userDetails: AuthenticationUserDetails) => {
			req.requesterDetails = { ...req.requesterDetails, ...userDetails };
			next();
		});
	};
}
