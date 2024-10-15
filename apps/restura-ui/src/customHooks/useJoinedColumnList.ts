import { useMemo } from 'react';
import SchemaService from '../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../state/globalState.js';

export type CombinedTableColumnName = { tableName: string; columnName: string };

export default function useJoinedColumnList(
	baseTableName: string,
	joins: Restura.JoinData[]
): CombinedTableColumnName[] {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const joinedColumnList = useMemo<CombinedTableColumnName[]>(() => {
		if (!schema) return [];

		let baseTable = schema.database.find((table) => table.name === baseTableName);
		if (!baseTable) return [];
		let columnList: CombinedTableColumnName[] = baseTable.columns.map((column) => {
			return { tableName: baseTable!.name, columnName: column.name };
		});

		joins.forEach((join) => {
			let joinTable = schema.database.find((table) => table.name === join.table);
			if (!joinTable) return;
			columnList = columnList.concat(
				joinTable.columns.map((column) => {
					return { tableName: joinTable!.name, columnName: column.name };
				})
			);
		});

		return columnList;
	}, [schema, baseTableName, joins]);
	return joinedColumnList;
}
