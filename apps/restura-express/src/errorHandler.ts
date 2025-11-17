import {
	HtmlStatusCodes,
	logger,
	RsError,
	type RsErrorInternalData,
	type RsRequest,
	type RsResponse
} from '@restura/core';
import type { NextFunction } from 'express';

export default function errorHandler(
	err: RsErrorInternalData | Error,
	_req: RsRequest<unknown>,
	res: RsResponse<unknown>,
	next: NextFunction
) {
	if (!err) {
		next();
		return;
	}

	logger.error(JSON.stringify(err));

	if (err instanceof RsError) {
		// Handle err's thar are of type RsError.

		if (err.err === 'CONNECTION_ERROR') {
			// Let the server die, so it will try to reconnect to database
			// THIS SHOULD NOT BE AN RsError.
			throw new RsError('CONNECTION_ERROR');
		}
	}

	// If an API request has invalid body we could potentially fail before we have even setup the sendError function
	// thus lets check if its available first.
	if (res.sendError) {
		if (err instanceof RsError) {
			res.sendError(err.err, err.msg || 'error', err.status, err.stack);
		} else if (err instanceof Error) {
			res.sendError('UNKNOWN_ERROR', err.message || 'A server error occurred', 500, err.stack);
		} else {
			res.sendError('SERVER_ERROR', 'A server error occurred', 500, err.stack);
		}
	} else res.status(HtmlStatusCodes.SERVER_ERROR).send({ err: 'SERVER_ERROR', msg: 'A server error occurred' });
}
