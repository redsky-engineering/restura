import { HtmlStatusCodes, logger, RsError, type RsRequest, type RsResponse } from '@restura/core';
import type { NextFunction } from 'express';

export default function errorHandler(
	err: unknown,
	_req: RsRequest<unknown>,
	res: RsResponse<unknown>,
	next: NextFunction
) {
	if (!err) {
		next();
		return;
	}

	logger.error(err);

	if (err instanceof RsError) {
		// Handle err's thar are of type RsError.
		if (err.err === 'CONNECTION_ERROR') {
			throw new RsError('CONNECTION_ERROR');
		}
	}

	// If an API request has invalid body we could potentially fail before we have even setup the sendError function
	// thus lets check if its available first.
	if (res.sendError) {
		if (err instanceof RsError) {
			res.sendError(err.err, err.msg, err.status, err.stack);
		} else if (err instanceof Error) {
			res.sendError('UNKNOWN_ERROR', err.message || 'A server error occurred', 500, err.stack);
		} else {
			const stack =
				err && typeof err === 'object' && 'stack' in err
					? (err as Record<string, string | undefined>).stack
					: undefined;
			res.sendError('UNKNOWN_ERROR', 'A server error occurred', 500, stack);
		}
	} else res.status(HtmlStatusCodes.SERVER_ERROR).send({ err: 'SERVER_ERROR', msg: 'A server error occurred' });
}
