import { Box, Button, Icon, Label, rsToastify } from '@redskytech/framework/ui';
import cloneDeep from 'lodash.clonedeep';
import * as React from 'react';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import themes from '../../../themes/themes.scss?export';
import DbTableCell from '../../dbTableCell/DbTableCell';
import './ColumnSection.scss';

import SchemaService from '../../../services/schema/SchemaService.js';
import MariaDbColumnNumericTypes = Restura.MariaDbColumnNumericTypes;

export const columnTypeList: (
	| Restura.MariaDbColumnDateTypes
	| Restura.MariaDbColumnStringTypes
	| Restura.MariaDbColumnNumericTypes
	| Restura.PostgresColumnNumericTypes
	| Restura.PostgresColumnStringTypes
	| Restura.PostgresColumnDateTypes
	| Restura.PostgresColumnJsonTypes
)[] = [
	'BOOLEAN',
	'TINYINT',
	'SMALLINT',
	'MEDIUMINT',
	'INTEGER',
	'BIGINT',
	'DECIMAL',
	'FLOAT',
	'DOUBLE',
	'CHAR',
	'VARCHAR',
	'TINYTEXT',
	'TINYBLOB',
	'TEXT',
	'BLOB',
	'MEDIUMTEXT',
	'MEDIUMBLOB',
	'LONGTEXT',
	'JSON',
	'LONGBLOB',
	'DATE',
	'DATETIME',
	'TIME',
	'TIMESTAMP',
	'ENUM',
	'BIGSERIAL',
	'JSONB'
];

export function isColumnType(
	value: string
): value is
	| Restura.MariaDbColumnDateTypes
	| Restura.MariaDbColumnStringTypes
	| Restura.MariaDbColumnNumericTypes
	| Restura.PostgresColumnNumericTypes
	| Restura.PostgresColumnStringTypes
	| Restura.PostgresColumnDateTypes
	| Restura.PostgresColumnJsonTypes {
	return columnTypeList.includes(value.toUpperCase() as (typeof columnTypeList)[number]);
}

interface ColumnSectionProps {
	tableName: string;
	searchTerm: string;
}

const ColumnSection: React.FC<ColumnSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState(globalState.schema);

	function getAllowLengthEdit(
		type: Restura.MariaDbColumnNumericTypes | Restura.MariaDbColumnStringTypes | Restura.MariaDbColumnDateTypes
	): boolean {
		const lengthTypes: (
			| Restura.MariaDbColumnNumericTypes
			| Restura.MariaDbColumnStringTypes
			| Restura.MariaDbColumnDateTypes
		)[] = ['CHAR', 'VARCHAR'];
		return lengthTypes.includes(type);
	}

	function getAllowValueEdit(
		type: Restura.MariaDbColumnNumericTypes | Restura.MariaDbColumnStringTypes | Restura.MariaDbColumnDateTypes
	): boolean {
		const valueTypes: (
			| Restura.MariaDbColumnNumericTypes
			| Restura.MariaDbColumnStringTypes
			| Restura.MariaDbColumnDateTypes
		)[] = ['ENUM', 'JSON', 'DECIMAL'];
		return valueTypes.includes(type);
	}

	function getAllowAutoIncrement(
		type: Restura.MariaDbColumnNumericTypes | Restura.MariaDbColumnStringTypes | Restura.MariaDbColumnDateTypes
	): boolean {
		const autoTypes: (
			| Restura.MariaDbColumnNumericTypes
			| Restura.MariaDbColumnStringTypes
			| Restura.MariaDbColumnDateTypes
		)[] = ['BIGINT', 'INTEGER', 'MEDIUMINT', 'SMALLINT', 'TINYINT'];
		return autoTypes.includes(type);
	}

	function columnHasUniqueIndex(name: string, tableData: Restura.TableData): boolean {
		return (
			tableData.indexes.find(
				(item) => item.columns.includes(name) && item.columns.length === 1 && item.isUnique
			) !== undefined
		);
	}

	function columnHasAnyIndex(name: string, tableData: Restura.TableData): boolean {
		return tableData.indexes.find((item) => item.columns.includes(name) && item.columns.length === 1) !== undefined;
	}

	function renderColumnHeaderRow() {
		return (
			<>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Name
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} minWidth={150} color={themes.neutralBeige500}>
					Type
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} minWidth={150} color={themes.neutralBeige500}>
					Column Value
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Length
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Auto Inc
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Unique
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Nullable
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} minWidth={150} color={themes.neutralBeige500}>
					Default
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} minWidth={150} color={themes.neutralBeige500}>
					Comment
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Index
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					FK (Table)
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					FK (Column)
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Permissions (role)
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} color={themes.neutralBeige500}>
					Permissions (scope)
				</Label>
				<Box /> {/* Empty box for the delete button */}
			</>
		);
	}

	function getColumnForeignKeyRefTable(columnName: string, tableData: Restura.TableData): string {
		const foreignKey = tableData.foreignKeys.find((item) => item.column === columnName);
		if (!foreignKey) return '';
		return foreignKey.refTable;
	}

	function getColumnForeignKeyRefColumn(columnName: string, tableData: Restura.TableData): string {
		const foreignKey = tableData.foreignKeys.find((item) => item.column === columnName);
		if (!foreignKey) return '';
		return foreignKey.refColumn;
	}

	function predictAndEditColumnData(
		updatedSchema: Restura.Schema,
		tableName: string,
		originalColumnName: string,
		newColumnName: string
	) {
		const tableData = SchemaService.getTableData(updatedSchema, tableName);
		const columnData = SchemaService.getColumnData(updatedSchema, props.tableName, originalColumnName);

		// No matter what update column name with what they choose.
		columnData.name = newColumnName;

		if (newColumnName.endsWith('Id')) {
			const refTableName = newColumnName.replace('Id', '');
			const refColumnName = 'id';
			const refTable = SchemaService.getTableData(updatedSchema, refTableName);
			let referenceIsValid = false;
			if (refTable) {
				const refColumnData = SchemaService.getColumnData(updatedSchema, refTableName, refColumnName);
				if (refColumnData) referenceIsValid = true;
			}

			if (referenceIsValid) {
				tableData.indexes.push({
					columns: [newColumnName],
					isUnique: false,
					isPrimaryKey: false,
					order: 'ASC',
					name: SchemaService.generateIndexName(tableName, [newColumnName], false)
				});

				tableData.foreignKeys.push({
					name: SchemaService.generateForeignKeyName(tableName, newColumnName, refTableName, refColumnName),
					onDelete: 'NO ACTION',
					onUpdate: 'NO ACTION',
					column: newColumnName,
					refTable: refTableName,
					refColumn: refColumnName
				});
				columnData.comment = `Foreign key to ${refTableName}(${refColumnName})`;
				columnData.isNullable = false;
			} else {
				// todo: show a popup that we couldn't figure out what table its referencing and show a selector of tables
			}

			delete columnData.length;
			columnData.type = 'BIGINT';
		} else if (newColumnName === 'id') {
			columnData.type = 'BIGINT';
			columnData.hasAutoIncrement = true;
			columnData.isNullable = false;
			delete columnData.length;
		} else if (newColumnName.endsWith('On')) {
			columnData.type = 'DATETIME';
			columnData.isNullable = false;
			columnData.default = 'now()';
			delete columnData.length;
		} else if (newColumnName === 'firstName' || newColumnName === 'lastName' || newColumnName === 'name') {
			columnData.type = 'VARCHAR';
			columnData.length = 30;
		} else if (newColumnName === 'address1') {
			columnData.type = 'VARCHAR';
			columnData.length = 30;
		} else if (newColumnName === 'role') {
			columnData.type = 'ENUM';
			columnData.value = "'ADMIN','USER'";
			delete columnData.length;
		} else if (newColumnName.startsWith('is') || newColumnName.startsWith('has')) {
			columnData.type = 'BOOLEAN';
			columnData.isNullable = false;
			delete columnData.length;
		} else {
			columnData.name = newColumnName;
		}
	}

	function hasDuplicateColumnName(newColumn: string, tableData: Restura.TableData) {
		return tableData.columns.find((item) => item.name === newColumn) !== undefined;
	}

	function isPrimaryColumn(columnName: string, tableData: Restura.TableData): boolean {
		let isPrimary =
			tableData.indexes.find((item) => item.columns.includes(columnName) && item.isPrimaryKey) !== undefined;
		const column = tableData.columns.find((item) => item.name === columnName);
		isPrimary ||= column?.isPrimary || false;
		return isPrimary;
	}

	function renderColumns() {
		if (!schema) return <></>;
		const tableData = schema.database.find((item) => item.name === props.tableName);
		if (!tableData) return <></>;

		return tableData.columns
			.filter((column) => {
				if (!props.searchTerm) return true;
				if (isColumnType(props.searchTerm)) {
					// Check that the column type matches the search term
					return column.type.toUpperCase() === props.searchTerm.toUpperCase();
				}
				return true;
			})
			.map((column) => {
				return (
					<React.Fragment key={column.name}>
						<DbTableCell
							isPrimaryKey={isPrimaryColumn(column.name, tableData!)}
							addId
							cellType={'text'}
							value={column.name}
							onChange={(value) => {
								if (value === column.name) return;
								if (hasDuplicateColumnName(value, tableData!)) {
									rsToastify.error('Column name already exists.', 'Duplicate Column Name');
									return;
								}

								const updatedSchema = cloneDeep(schema);

								if (column.name.includes('new_column')) {
									predictAndEditColumnData(updatedSchema, props.tableName, column.name, value);
								} else {
									const columnData = SchemaService.getColumnData(
										updatedSchema,
										props.tableName,
										column.name
									);
									columnData.name = value;
								}

								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell
							cellType={'select'}
							selectOptions={columnTypeList}
							value={column.type}
							onChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								if (!getAllowLengthEdit(value as MariaDbColumnNumericTypes)) delete columnData.length;
								else columnData.length = columnData.length || 10;
								columnData.type = value as Restura.MariaDbColumnDateTypes;
								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell
							disableEdit={
								!getAllowValueEdit(
									column.type as
										| Restura.MariaDbColumnNumericTypes
										| Restura.MariaDbColumnStringTypes
										| Restura.MariaDbColumnDateTypes
								)
							}
							cellType={'multiSelect'}
							selectOptions={
								column.value ? (column.value.replaceAll("'", '').split(',') as string[]) : []
							}
							value={column.value ? column.value.replaceAll("'", '').split(',') : []}
							onMultiSelectChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								columnData.value = '';
								value.forEach((item, index) => {
									if (index === 0) columnData.value += "'" + item.replaceAll("'", '') + "'";
									else columnData.value += ",'" + item.replaceAll("'", '') + "'";
								});
								setSchema(updatedSchema);
							}}
							isMultiSelectCreatable
						/>
						<DbTableCell
							disableEdit={
								!getAllowLengthEdit(
									column.type as
										| Restura.MariaDbColumnNumericTypes
										| Restura.MariaDbColumnStringTypes
										| Restura.MariaDbColumnDateTypes
								)
							}
							cellType={'text'}
							value={column.length ? column.length.toString() : ''}
							onChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								columnData.length = parseInt(value);
								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell
							disableEdit={
								!getAllowAutoIncrement(
									column.type as
										| Restura.MariaDbColumnNumericTypes
										| Restura.MariaDbColumnStringTypes
										| Restura.MariaDbColumnDateTypes
								)
							}
							cellType={'selectBoolean'}
							value={column.hasAutoIncrement || false}
							onChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								columnData.hasAutoIncrement = value === 'true';
								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell
							cellType={'selectBoolean'}
							value={columnHasUniqueIndex(column.name, tableData!)}
							onChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
								if (value === 'true') {
									updatedTableData.indexes.push({
										name: SchemaService.generateIndexName(props.tableName, [column.name], true),
										columns: [column.name],
										order: 'ASC',
										isPrimaryKey: false,
										isUnique: true
									});
								} else {
									updatedTableData.indexes = updatedTableData.indexes.filter(
										(index) =>
											index.name !==
											SchemaService.generateIndexName(props.tableName, [column.name], true)
									);
								}
								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell
							cellType={'selectBoolean'}
							value={column.isNullable}
							onChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								columnData.isNullable = value === 'true';
								setSchema(updatedSchema);
							}}
						/>
						{column.type !== 'ENUM' ? (
							<DbTableCell
								cellType={'text'}
								value={column.default || ''}
								onChange={(value) => {
									const updatedSchema = cloneDeep(schema);
									const columnData = SchemaService.getColumnData(
										updatedSchema,
										props.tableName,
										column.name
									);
									if (value) columnData.default = value;
									else delete columnData.default;
									setSchema(updatedSchema);
								}}
							/>
						) : (
							<DbTableCell
								cellType={'select'}
								selectOptions={(!!column.value && column.value.replaceAll("'", '').split(',')) || []}
								value={(column.default && column.default.replaceAll("'", '')) || ''}
								onChange={(value) => {
									const updatedSchema = cloneDeep(schema);
									const columnData = SchemaService.getColumnData(
										updatedSchema,
										props.tableName,
										column.name
									);
									if (!getAllowLengthEdit(value as MariaDbColumnNumericTypes))
										delete columnData.length;
									else columnData.length = columnData.length || 10;
									columnData.default = ("'" + value + "'") as Restura.MariaDbColumnDateTypes;
									setSchema(updatedSchema);
								}}
							/>
						)}
						<DbTableCell
							cellType={'text'}
							value={column.comment || ''}
							onChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								if (value) columnData.comment = value;
								else delete columnData.comment;
								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell disableEdit cellType={'text'} value={columnHasAnyIndex(column.name, tableData!)} />
						<DbTableCell
							disableEdit
							cellType={'text'}
							value={getColumnForeignKeyRefTable(column.name, tableData!)}
							onChange={() => {}}
						/>
						<DbTableCell
							disableEdit
							cellType={'text'}
							value={getColumnForeignKeyRefColumn(column.name, tableData!)}
						/>
						<DbTableCell
							cellType={'multiSelect'}
							selectOptions={schema.roles}
							value={column.roles}
							onMultiSelectChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								columnData.roles = value;
								setSchema(updatedSchema);
							}}
						/>
						<DbTableCell
							cellType={'multiSelect'}
							selectOptions={schema.scopes}
							value={column.scopes}
							onMultiSelectChange={(value) => {
								const updatedSchema = cloneDeep(schema);
								const columnData = SchemaService.getColumnData(
									updatedSchema,
									props.tableName,
									column.name
								);
								columnData.scopes = value;
								setSchema(updatedSchema);
							}}
						/>
						<Box display={'flex'} alignItems={'center'}>
							<Icon
								iconImg={'icon-delete'}
								padding={4}
								fontSize={16}
								cursorPointer
								onClick={() => {
									const updatedSchema = cloneDeep(schema);
									const updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
									updatedTableData.columns = updatedTableData.columns.filter(
										(col) => col.name !== column.name
									);
									setSchema(updatedSchema);
								}}
							/>
						</Box>
					</React.Fragment>
				);
			});
	}

	function addNewTableColumn() {
		if (!schema) return;
		const updatedSchema = cloneDeep(schema);
		const tableData = SchemaService.getTableData(updatedSchema, props.tableName);
		const newColumnName = `new_column_${Math.random().toString(36).substr(2, 5)}`;
		tableData.columns.push({
			roles: [],
			name: newColumnName,
			type: 'VARCHAR',
			length: 255,
			isNullable: false,
			scopes: []
		});
		setSchema(updatedSchema);
		setTimeout(() => {
			// Simulate a click on the new column to open the edit dialog
			const newColumn = document.getElementById(`Cell-${newColumnName}`);
			if (newColumn) {
				newColumn.click();
			}
			const input = document.querySelector<HTMLInputElement>(`#Cell-${newColumnName} input`);
			if (input) {
				input.focus();
				input.setSelectionRange(0, input.value.length);
			}
		}, 100);
	}

	return (
		<Box className={'rsColumnSection'}>
			<Label variant={'subheader2'} weight={'regular'} mt={32} mb={16}>
				Columns
			</Label>
			<Box className={'tableColumnDetailsGrid'}>
				{renderColumnHeaderRow()}
				{renderColumns()}
			</Box>
			<Button
				mt={8}
				look={'iconPrimary'}
				onClick={addNewTableColumn}
				icon={[
					{
						iconImg: 'icon-plus',
						fontSize: 16,
						position: 'LEFT'
					}
				]}
			/>
		</Box>
	);
};

export default ColumnSection;
