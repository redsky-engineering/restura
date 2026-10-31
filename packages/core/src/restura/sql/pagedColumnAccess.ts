import { RsError } from '../RsError.js';
import type { ResponseData, StandardRouteData } from '../schemas/resturaSchema.js';
import { isSensitiveColumnName } from './psqlSchemaUtils.js';

interface ColumnAllowList {
	columns: Set<string>;
	sensitiveOptIns: Set<string>;
	responseNames: Set<string>;
}

export interface PagedColumnAccess {
	filter: ColumnAllowList;
	sort: ColumnAllowList;
	// Writes run without joins, so Postgres resolves an unqualified column to the base table
	unqualifiedFilterTable?: string;
}

export function buildPagedColumnAccess(
	routeData: StandardRouteData,
	readableResponse: ResponseData[]
): PagedColumnAccess {
	const responseColumns = new Set<string>();
	const responseNames = new Set<string>();
	const sensitiveSortOptIns = new Set(
		(routeData.sortableColumns ?? []).filter((entry) => entry.startsWith('!')).map((entry) => entry.slice(1))
	);
	for (const item of readableResponse) {
		const columnKey =
			item.subquery || item.type || !item.selector ? undefined : toColumnKey(item.selector, routeData.table);
		if (columnKey) responseColumns.add(columnKey);
		const isSensitiveAlias =
			columnKey !== undefined &&
			isSensitiveColumnName(splitColumnKey(columnKey)[1]) &&
			!sensitiveSortOptIns.has(columnKey);
		if (!isSensitiveAlias) responseNames.add(item.name);
	}
	return {
		filter: buildAllowList(responseColumns, new Set(), routeData.filterableColumns),
		sort: buildAllowList(responseColumns, responseNames, routeData.sortableColumns)
	};
}

export function assertFilterColumnsAllowed(referencedColumns: string[][], access: PagedColumnAccess): void {
	const checked = new Set<string>();
	for (const parts of referencedColumns) {
		const reference = parts.join('.');
		if (checked.has(reference)) continue;
		checked.add(reference);
		const isAllowed =
			parts.length === 1
				? isColumnAllowed(access.filter, access.unqualifiedFilterTable, parts[0])
				: isColumnAllowed(access.filter, parts[0], parts[1]);
		if (!isAllowed) {
			throw new RsError(
				'BAD_REQUEST',
				`Filtering on "${reference}" is not allowed for this route. Allowed columns: ${describeAllowList(access.filter)}`
			);
		}
	}
}

export function assertSortColumnAllowed(sortBy: string, access: PagedColumnAccess): void {
	const reference = sortBy.replace(/"/g, '');
	const dotIndex = reference.indexOf('.');
	const isAllowed =
		dotIndex === -1
			? (access.sort.responseNames.has(reference) && !isSensitiveColumnName(reference)) ||
				isColumnAllowed(access.sort, undefined, reference)
			: isColumnAllowed(access.sort, reference.slice(0, dotIndex), reference.slice(dotIndex + 1));
	if (!isAllowed) {
		throw new RsError(
			'BAD_REQUEST',
			`Sorting by "${reference}" is not allowed for this route. Allowed columns: ${describeAllowList(access.sort)}`
		);
	}
}

function buildAllowList(
	responseColumns: Set<string>,
	responseNames: Set<string>,
	configuredEntries: string[] | undefined
): ColumnAllowList {
	const allowList: ColumnAllowList = {
		columns: new Set(responseColumns),
		sensitiveOptIns: new Set(),
		responseNames
	};
	for (const entry of configuredEntries ?? []) {
		const isSensitiveOptIn = entry.startsWith('!');
		const columnKey = isSensitiveOptIn ? entry.slice(1) : entry;
		allowList.columns.add(columnKey);
		if (isSensitiveOptIn) allowList.sensitiveOptIns.add(columnKey);
	}
	return allowList;
}

function toColumnKey(selector: string, baseTable: string): string | undefined {
	const parts = selector.split('.');
	if (parts.length === 1) return `${baseTable}.${parts[0]}`;
	if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
	return undefined;
}

// An unqualified column matches any allowed entry with that column name; Postgres rejects it as ambiguous
// when more than one table in the query has the column.
function isColumnAllowed(allowList: ColumnAllowList, qualifier: string | undefined, column: string): boolean {
	const matchingKeys =
		qualifier === undefined
			? [...allowList.columns].filter((columnKey) => columnKey.split('.')[1] === column)
			: [`${qualifier}.${column}`].filter((columnKey) => allowList.columns.has(columnKey));
	if (matchingKeys.length === 0) return false;
	if (!isSensitiveColumnName(column)) return true;
	return matchingKeys.some((columnKey) => allowList.sensitiveOptIns.has(columnKey));
}

function describeAllowList(allowList: ColumnAllowList): string {
	const columnKeys = [...allowList.columns].filter((columnKey) =>
		isColumnAllowed(allowList, ...splitColumnKey(columnKey))
	);
	const responseNames = [...allowList.responseNames].filter((name) => !isSensitiveColumnName(name));
	const allowed = [...new Set([...responseNames, ...columnKeys])].sort();
	return allowed.length ? allowed.join(', ') : '(none)';
}

function splitColumnKey(columnKey: string): [string, string] {
	const dotIndex = columnKey.indexOf('.');
	return [columnKey.slice(0, dotIndex), columnKey.slice(dotIndex + 1)];
}
