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
	err: RsErrorInternalData,
	_req: RsRequest<unknown>,
	res: RsResponse<unknown>,
	next: NextFunction
) {
	if (!err) {
		next();
		return;
	}

	logger.error(JSON.stringify(err));

	if (err.err === 'CONNECTION_ERROR') {
		// Let the server die, so it will try to reconnect to database
		// THIS SHOULD NOT BE AN RsError.
		throw new RsError('CONNECTION_ERROR');
	}

	// If an API request has invalid body we could potentially fail before we have even setup the sendError function
	// thus lets check if its available first.
	if (res.sendError) {
		res.sendError(err.err, err.msg || err.message || 'error', err.status, err.stack);
	} else res.status(HtmlStatusCodes.SERVER_ERROR).send({ err: 'SERVER_ERROR', msg: 'A server error occurred' });
}
