import * as React from 'react';
import './ForeignKeySection.scss';
import { Box, Button, Icon, Label } from '@redskytech/framework/ui';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import cloneDeep from 'lodash.clonedeep';
import SchemaService from '../../../services/schema/SchemaService.js';
import DbTableCell from '../../dbTableCell/DbTableCell';
import ForeignKeyActions = Restura.ForeignKeyActions;

interface ForeignKeySectionProps {
	tableName: string;
}

const ForeignKeySection: React.FC<ForeignKeySectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState(globalState.schema);

	function getOtherTableNames() {
		if (!schema) return [];
		let otherTableNames: string[] = [];
		schema.database.forEach((table) => {
			// We allow foreign keys to our table for parent-child relationships
			otherTableNames.push(table.name);
		});
		return otherTableNames;
	}

	function getColumnsForTableThatAreBigInt(tableName: string) {
		if (!schema) return [];
		let tableData = schema.database.find((table) => table.name === tableName);
		if (!tableData) return [];
		let columns: string[] = [];
		tableData.columns.forEach((column) => {
			if (column.type === 'BIGINT') columns.push(column.name);
		});
		return columns;
	}

	function renderForeignKeysHeader() {
		return (
			<>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Name
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Column
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Ref Table
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Ref Column
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					On Delete
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					On Update
				</Label>
				<Box /> {/* Empty box for the delete button */}
			</>
		);
	}

	function renderForeignKeys() {
		if (!schema) return <></>;
		let tableData = schema.database.find((item) => item.name === props.tableName);
		if (!tableData) return <></>;
		return tableData.foreignKeys.map((keyData) => {
			return (
				<React.Fragment key={keyData.name}>
					<DbTableCell disableEdit cellType={'text'} value={keyData.name} />
					<DbTableCell
						cellType={'select'}
						value={keyData.column}
						selectOptions={getColumnsForTableThatAreBigInt(props.tableName)}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.foreignKeys.find(
								(item) => item.name === keyData.name
							);
							if (updatedIndexData) {
								updatedIndexData.column = value;
								updatedIndexData.name = SchemaService.generateForeignKeyName(
									props.tableName,
									updatedIndexData.column,
									updatedIndexData.refTable,
									updatedIndexData.refColumn
								);
							}
							setSchema(updatedSchema);
						}}
					/>
					<DbTableCell
						cellType={'select'}
						value={keyData.refTable}
						selectOptions={getOtherTableNames()}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.foreignKeys.find(
								(item) => item.name === keyData.name
							);
							if (updatedIndexData) {
								updatedIndexData.refTable = value;
								updatedIndexData.name = SchemaService.generateForeignKeyName(
									props.tableName,
									updatedIndexData.column,
									updatedIndexData.refTable,
									updatedIndexData.refColumn
								);
							}
							setSchema(updatedSchema);
						}}
					/>
					<DbTableCell
						cellType={'select'}
						value={keyData.refColumn}
						selectOptions={getColumnsForTableThatAreBigInt(keyData.refTable)}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.foreignKeys.find(
								(item) => item.name === keyData.name
							);
							if (updatedIndexData) {
								updatedIndexData.refColumn = value;
								updatedIndexData.name = SchemaService.generateForeignKeyName(
									props.tableName,
									updatedIndexData.column,
									updatedIndexData.refTable,
									updatedIndexData.refColumn
								);
							}
							setSchema(updatedSchema);
						}}
					/>
					<DbTableCell
						cellType={'select'}
						value={keyData.onDelete}
						selectOptions={['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT']}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.foreignKeys.find(
								(item) => item.name === keyData.name
							);
							if (updatedIndexData) updatedIndexData.onDelete = value as ForeignKeyActions;

							setSchema(updatedSchema);
						}}
					/>
					<DbTableCell
						cellType={'select'}
						value={keyData.onUpdate}
						selectOptions={['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT']}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.foreignKeys.find(
								(item) => item.name === keyData.name
							);
							if (updatedIndexData) updatedIndexData.onUpdate = value as ForeignKeyActions;

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
								let updatedSchema = cloneDeep(schema);
								let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
								updatedTableData.foreignKeys = updatedTableData.foreignKeys.filter(
									(item) => item.name !== keyData.name
								);
								setSchema(updatedSchema);
							}}
						/>
					</Box>
				</React.Fragment>
			);
		});
	}

	function addNewForeignKey() {
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let tableData = SchemaService.getTableData(updatedSchema, props.tableName);
		tableData.foreignKeys.push({
			name: SchemaService.generateForeignKeyName(props.tableName, 'MISSING!', 'MISSING!', 'MISSING!'),
			column: 'MISSING!',
			onDelete: 'NO ACTION',
			onUpdate: 'NO ACTION',
			refColumn: 'MISSING!',
			refTable: 'MISSING!'
		});
		setSchema(updatedSchema);
	}

	return (
		<Box className={'rsForeignKeySection'}>
			<Label variant={'subheader2'} weight={'regular'} mt={32} mb={16}>
				Foreign Keys
			</Label>
			<Box className={'tableForeignKeysDetailsGrid'}>
				{renderForeignKeysHeader()}
				{renderForeignKeys()}
			</Box>
			<Button
				mt={8}
				look={'iconPrimary'}
				onClick={addNewForeignKey}
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

export default ForeignKeySection;
