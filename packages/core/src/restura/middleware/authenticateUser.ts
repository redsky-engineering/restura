import type { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/customExpress.types.js';
import type { AuthenticateHandler, AuthenticationUserDetails } from '../types/restura.types.js';

export function authenticateUser(applicationAuthenticateHandler: AuthenticateHandler) {
	return (req: RsRequest, res: RsResponse, next: NextFunction) => {
		// Call the custom function from the main application
		applicationAuthenticateHandler(req, res, (userDetails: AuthenticationUserDetails) => {
			// @ts-expect-error - We allow the requesterDetails to be updated with extra details not defined in the RequesterDetails interface
			req.requesterDetails = { ...req.requesterDetails, ...userDetails };
			next();
		});
	};
}
