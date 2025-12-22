import * as express from 'express';
import { IncomingHttpHeaders } from 'http2';
import type { ErrorCode, HtmlStatusCodes } from '../RsError.js';
import type { RouteData } from '../schemas/resturaSchema.js';
import type { RsPagedResponseData } from './resturaTypes.js';

// Headers are always passed up as strings and are always lower cased by NodeJs Express
export interface RsHeaders extends IncomingHttpHeaders {
	'x-auth-token'?: string;
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type RequesterDetails<T extends object = {}> = {
	role: string; // The role of the user, blank if anonymous or not applicable
	scopes: string[]; // The scopes of the user, blank if anonymous or not applicable
	host: string;
	ipAddress: string;
	userId?: number;
	isSystemUser?: boolean;
} & T;

export interface RsRequest<T = unknown, U extends object = Record<string, unknown>> extends express.Request {
	requesterDetails: RequesterDetails<U>;
	data: T;
	routeData?: RouteData;
}

export type DynamicObject<T = unknown> = { [key: string]: T };

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
