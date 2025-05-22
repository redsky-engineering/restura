import type { RsRequest, RsResponse } from './customExpressTypes.js';

export interface SchemaChangeValue {
	name: string;
	changeType: 'NEW' | 'MODIFIED' | 'DELETED';
}

export interface SchemaPreview {
	commands: string;
	endPoints: SchemaChangeValue[];
	globalParams: SchemaChangeValue[];
	roles: SchemaChangeValue[];
	customTypes: boolean;
}

export type StandardOrderTypes = 'ASC' | 'DESC' | 'RAND' | 'NONE';
export type ConjunctionTypes = 'AND' | 'OR';
export type MatchTypes = 'exact' | 'fuzzy' | 'like' | 'greaterThan' | 'greaterThanEqual' | 'lessThan' | 'lessThanEqual';

export interface RsResponseData<T> {
	data: T;
}

export interface RsErrorData {
	err: string;
	msg: string;
	stack?: string;
}

export interface RsPagedResponseData<T> extends RsResponseData<T> {
	total: number;
}

export interface PageQuery {
	page: number;
	perPage: number;
	sortBy: string;
	sortOrder: StandardOrderTypes;
	filter?: string;
	[key: string]: string | number | boolean | object | null | undefined; // Other keys with any JSON-compatible value type
}

export interface AuthenticatedRequesterDetails {
	role: string;
	scopes: string[];
	userId?: number;
	[key: string]: string | number | boolean | object | null | undefined; // Other keys with any JSON-compatible value type
}

export type OnValidAuthenticationCallback = (authenticatedRequesterDetails: AuthenticatedRequesterDetails) => void;

export type AuthenticateHandler = (
	req: RsRequest<unknown>,
	res: RsResponse<unknown>,
	onValid: OnValidAuthenticationCallback
) => Promise<void>;
