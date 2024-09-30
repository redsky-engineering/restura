import * as express from 'express';
import { IncomingHttpHeaders } from 'http2';
import type { ErrorCode, HtmlStatusCodes } from '../errors.js';
import type { RsPagedResponseData } from './restura.types.js';

// Headers are always passed up as strings and are always lower cased by NodeJs Express
export interface RsHeaders extends IncomingHttpHeaders {
	'x-auth-token'?: string;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export interface RequesterDetails {
	role?: string;
	host: string;
	ipAddress: string;
}

export interface RsRequest<T = unknown> extends express.Request {
	requesterDetails: RequesterDetails;
	data: T;
}

export type DynamicObject = { [key: string]: unknown };

export interface RsResponse<T = unknown> extends express.Response {
	sendData: (data: T, statusCode?: number) => void;
	sendNoWrap: (data: T, statusCode?: number) => void;
	sendError: (err: ErrorCode, msg: string, htmlStatusCode?: HtmlStatusCodes, stack?: string) => void;
	sendPaginated: (pagedData: RsPagedResponseData<T>, statusCode?: number) => void;
	_contentLength?: number;
}

export type RsRouteHandler<T = unknown, U = unknown> = (
	req: RsRequest<T>,
	res: RsResponse<U>,
	next?: express.NextFunction
) => Promise<void>;

export interface AsyncExpressApplication {
	get: (url: string, handler: RsRouteHandler, nextFunction?: RsRouteHandler) => Promise<void> | void;
	post: (url: string, handler: RsRouteHandler, nextFunction?: RsRouteHandler) => Promise<void> | void;
	put: (url: string, handler: RsRouteHandler, nextFunction?: RsRouteHandler) => Promise<void> | void;
	patch: (url: string, handler: RsRouteHandler, nextFunction?: RsRouteHandler) => Promise<void> | void;
	delete: (url: string, handler: RsRouteHandler, nextFunction?: RsRouteHandler) => Promise<void> | void;
}
