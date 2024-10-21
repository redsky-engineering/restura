declare namespace RedSky {
	export type StandardOrderTypes = 'ASC' | 'DESC' | 'RAND' | 'NONE';
	export type ConjunctionTypes = 'AND' | 'OR';
	export type MatchTypes =
		| 'exact'
		| 'fuzzy'
		| 'like'
		| 'greaterThan'
		| 'greaterThanEqual'
		| 'lessThan'
		| 'lessThanEqual';

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
		page?: number;
		perPage?: number;
		sortBy?: string;
		sortOrder?: StandardOrderTypes;
		filter?: string;
	}
}
