import * as React from 'react';
import './IndexSection.scss';
import { Box, Button, Icon, Label, rsToastify } from '@redskytech/framework/ui';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import SchemaService from '../../../services/schema/SchemaService.js';
import cloneDeep from 'lodash.clonedeep';
import DbTableCell from '../../dbTableCell/DbTableCell';

interface IndexSectionProps {
	tableName: string;
}

const IndexSection: React.FC<IndexSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState(globalState.schema);

	function renderIndexesHeader() {
		return (
			<>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Name
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Unique
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Order
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'} minWidth={200}>
					Columns
				</Label>
				<Box /> {/* Empty box for the delete button */}
			</>
		);
	}

	function getAllColumns(tableData: Restura.TableData): string[] {
		let columns: string[] = [];
		tableData.columns.forEach((column) => {
			columns.push(column.name);
		});
		return columns;
	}

	function hasDuplicateColumns(columns: string[], tableData: Restura.TableData): boolean {
		let columnsSorted = columns.sort();
		for (let index of tableData.indexes) {
			if (index.columns.length === columns.length) {
				let indexColumnsSorted = [...index.columns].sort();
				if (columnsSorted.join('-') === indexColumnsSorted.join('-')) return true;
			}
		}
		return false;
	}

	function renderIndexes(): React.ReactNode {
		if (!schema) return <></>;
		let tableData = schema.database.find((item) => item.name === props.tableName);
		if (!tableData) return <></>;
		return tableData.indexes.map((indexData) => {
			return (
				<React.Fragment key={indexData.name}>
					<DbTableCell disableEdit cellType={'text'} value={indexData.name} />
					<DbTableCell
						cellType={'selectBoolean'}
						value={indexData.isUnique}
						disableEdit={indexData.isPrimaryKey}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.indexes.find(
								(item) => item.name === indexData.name
							);
							if (updatedIndexData) {
								updatedIndexData.isUnique = value === 'true';
								updatedIndexData.name = SchemaService.generateIndexName(
									props.tableName,
									updatedIndexData.columns,
									updatedIndexData.isUnique
								);
							}
							setSchema(updatedSchema);
						}}
					/>
					<DbTableCell
						cellType={'select'}
						disableEdit={indexData.isPrimaryKey}
						value={indexData.order}
						selectOptions={['ASC', 'DESC']}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
							let updatedIndexData = updatedTableData.indexes.find(
								(item) => item.name === indexData.name
							);
							if (updatedIndexData) {
								updatedIndexData.order = value as 'ASC' | 'DESC';
							}
							setSchema(updatedSchema);
						}}
					/>
					{indexData.isPrimaryKey ? (
						<DbTableCell
							cellType={'select'}
							value={indexData.columns}
							emptyValue={'MISSING!'}
							selectOptions={getAllColumns(tableData!)}
							onChange={(value) => {
								if (value === indexData.columns[0]) return;
								let updatedSchema = cloneDeep(schema);
								let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
								let updatedIndexData = updatedTableData.indexes.find(
									(item) => item.name === indexData.name
								);
								if (updatedIndexData) updatedIndexData.columns = [value];
								setSchema(updatedSchema);
							}}
						/>
					) : (
						<DbTableCell
							cellType={'multiSelect'}
							value={indexData.columns}
							emptyValue={'MISSING!'}
							selectOptions={getAllColumns(tableData!)}
							onMultiSelectChange={(value) => {
								if (hasDuplicateColumns(value, tableData!)) {
									rsToastify.error(
										'Duplicate index on same columns are not allowed',
										'Error Duplicate Index'
									);
									return;
								}

								let updatedSchema = cloneDeep(schema);
								let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
								let updatedIndexData = updatedTableData.indexes.find(
									(item) => item.name === indexData.name
								);
								if (updatedIndexData) {
									updatedIndexData.columns = value;
									updatedIndexData.name = SchemaService.generateIndexName(
										props.tableName,
										updatedIndexData.columns,
										updatedIndexData.isUnique
									);
								}
								setSchema(updatedSchema);
							}}
						/>
					)}
					<Box display={'flex'} alignItems={'center'}>
						{indexData.isPrimaryKey ? (
							<Box />
						) : (
							<Icon
								iconImg={'icon-delete'}
								padding={4}
								fontSize={16}
								cursorPointer
								onClick={() => {
									let updatedSchema = cloneDeep(schema);
									let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
									updatedTableData.indexes = updatedTableData.indexes.filter(
										(item) => item.name !== indexData.name
									);
									setSchema(updatedSchema);
								}}
							/>
						)}
					</Box>
				</React.Fragment>
			);
		});
	}

	function addNewTableIndex() {
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let tableData = SchemaService.getTableData(updatedSchema, props.tableName);
		tableData.indexes.push({
			name: SchemaService.generateIndexName(props.tableName, ['unknown'], false),
			isUnique: false,
			order: 'ASC',
			columns: [],
			isPrimaryKey: false
		});
		setSchema(updatedSchema);
	}

	return (
		<Box className={'rsIndexSection'}>
			<Label variant={'subheader2'} weight={'regular'} mt={32} mb={16}>
				Indexes
			</Label>
			<Box className={'tableIndexesDetailsGrid'}>
				{renderIndexesHeader()}
				{renderIndexes()}
			</Box>
			<Button
				mt={8}
				look={'iconPrimary'}
				onClick={addNewTableIndex}
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

export default IndexSection;
