/** Auto generated file. DO NOT MODIFY **/
/** This file contains types that may be used in the CustomTypes of Restura **/
/** For example export interface MyPagedQuery extends Restura.PageQuery { } **/

declare namespace Restura {
	export type StandardOrderTypes = 'ASC' | 'DESC' | 'RAND' | 'NONE';
	export interface PageQuery {
		page?: number;
		perPage?: number;
		sortBy?: string;
		sortOrder?: StandardOrderTypes;
		filter?: string;
	}
}
