import type { NextFunction } from 'express';
import type { RsRequest, RsResponse } from '../types/expressCustom.js';
import type { AuthenticateHandler, RoleWithOptionalUserDetails } from '../types/restura.types.js';

export async function authenticateUser(applicationAuthenticateHandler: AuthenticateHandler) {
	return (req: RsRequest, res: RsResponse, next: NextFunction) => {
		// Call the custom function
		applicationAuthenticateHandler(
			req,
			(userDetails: RoleWithOptionalUserDetails) => {
				req.requesterDetails = { ...req.requesterDetails, ...userDetails };
				next();
			},
			(errorMessage: string) => {
				res.sendError('UNAUTHORIZED', errorMessage);
			}
		);
	};
}
