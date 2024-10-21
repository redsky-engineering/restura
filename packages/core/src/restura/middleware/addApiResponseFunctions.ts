import { NextFunction } from 'express';
import { RsError, type ErrorCode, type HtmlStatusCodes } from '../errors.js';
import { restura } from '../restura.js';
import type { RsRequest, RsResponse } from '../types/customExpress.types.js';
import type { RsErrorData, RsPagedResponseData } from '../types/restura.types.js';

export default function addApiResponseFunctions(req: RsRequest<unknown>, res: RsResponse<unknown>, next: NextFunction) {
	/**
	 * Sends given data inside { data: data };
	 */
	res.sendData = function (data, statusCode = 200) {
		res.status(statusCode).send({ data });
	};

	/**
	 * Sends data exactly as it was given, useful for 3rd party APIs
	 */
	res.sendNoWrap = function (dataNoWrap, statusCode = 200) {
		res.status(statusCode).send(dataNoWrap);
	};

	/**
	 * Sends a paginated
	 * @param pagedData - A Redsky paged object
	 * @param statusCode
	 */
	res.sendPaginated = function (pagedData: RsPagedResponseData<unknown>, statusCode = 200) {
		res.status(statusCode).send({ data: pagedData.data, total: pagedData.total });
	};

	/**
	 * Sends a RedSky RsErrorData
	 */
	res.sendError = function (shortError: ErrorCode, msg: string, htmlStatusCode?: HtmlStatusCodes, stack?: string) {
		if (htmlStatusCode === undefined) {
			if (RsError.htmlStatus(shortError) !== undefined) {
				htmlStatusCode = RsError.htmlStatus(shortError);
			} else {
				htmlStatusCode = 500;
			}
		}

		const errorData: RsErrorData = {
			err: shortError,
			msg,
			...(restura.resturaConfig.sendErrorStackTrace && stack ? { stack } : {})
		};
		res.status(htmlStatusCode as number).send(errorData);
	};

	next();
}
