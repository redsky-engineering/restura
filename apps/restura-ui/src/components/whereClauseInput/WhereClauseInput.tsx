import * as React from 'react';
import './WhereClauseInput.scss';
import { Box, Button, Icon, Label, popupController, Select } from '@redskytech/framework/ui';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../popups/columnPickerPopup/ColumnPickerPopup';
import AutoComplete from '../autoComplete/AutoComplete';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';

interface WhereClauseInputProps {
	routeData: Restura.StandardRouteData;
	baseTableName: string;
	where: Restura.WhereData[];
	onAddWhereClause: (whereClause: Restura.WhereData) => void;
	onUpdateWhereClause: (whereIndex: number, whereClause: Restura.WhereData) => void;
	onRemoveWhereClause: (whereIndex: number) => void;
}

const WhereClauseInput: React.FC<WhereClauseInputProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	function handleAddStatement() {
		popupController.open<ColumnPickerPopupProps>(ColumnPickerPopup, {
			autoCloseOnSelect: true,
			headerText: 'Select Column',
			baseTable: props.baseTableName,
			onColumnSelect: (tableWithJoinColumn, columnData) => {
				let whereClauseLength = props.where.length;

				props.onAddWhereClause({
					tableName: tableWithJoinColumn.table,
					columnName: columnData.name,
					operator: '=',
					value: 'TRUE',
					...(whereClauseLength > 0 && { conjunction: 'AND' })
				});
			},
			onCustomSelect: () => {
				props.onAddWhereClause({
					custom: 'TRUE',
					conjunction: 'AND'
				});
			}
		});
	}

	function renderWhereStatements() {
		if (props.where.length === 0)
			return (
				<Label variant={'body1'} weight={'bold'}>
					No Where Clause
				</Label>
			);

		return props.where.map((whereData: Restura.WhereData, whereIndex) => {
			if (!schema) return <></>;
			let uniqueKey =
				props.routeData.path +
				whereData.tableName +
				whereData.columnName +
				whereData.operator +
				whereData.custom;
			return (
				// Use a random key since we don't have a unique identifier for each where statement
				<React.Fragment key={uniqueKey}>
					{!!whereData.conjunction && (
						<Select
							value={{ label: whereData.conjunction, value: whereData.conjunction }}
							options={[
								{ label: 'AND', value: 'AND' },
								{ label: 'OR', value: 'OR' }
							]}
							className={'conjunction'}
							onChange={(newValue) => {
								if (!newValue) return;
								props.onUpdateWhereClause(whereIndex, { ...whereData, conjunction: newValue.value });
							}}
						/>
					)}
					{whereData.custom ? (
						<Box className={'whereItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									props.onRemoveWhereClause(whereIndex);
								}}
							/>
							<AutoComplete
								options={[
									...schema.globalParams.map((param) => `#${param}`),
									...props.routeData!.request!.map((request) => `$${request.name}`)
								]}
								startSymbols={['$', '#']}
								value={whereData.custom}
								onChange={(newValue) => {
									if (!newValue) return;
									props.onUpdateWhereClause(whereIndex, { ...whereData, custom: newValue });
								}}
							/>
						</Box>
					) : (
						<Box className={'whereItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									props.onRemoveWhereClause(whereIndex);
								}}
							/>
							<Label variant={'body1'} weight={'regular'} className={'keyword'}>
								{whereData.tableName}.{whereData.columnName}
							</Label>
							<Select
								value={{ label: whereData.operator, value: whereData.operator }}
								options={[
									{ label: '=', value: '=' },
									{ label: '<', value: '<' },
									{ label: '>', value: '>' },
									{ label: '<=', value: '<=' },
									{ label: '>=', value: '>=' },
									{ label: '!=', value: '!=' },
									{ label: 'LIKE', value: 'LIKE' },
									{ label: 'IN', value: 'IN' },
									{ label: 'NOT IN', value: 'NOT IN' },
									{ label: 'STARTS WITH', value: 'STARTS WITH' },
									{ label: 'ENDS WITH', value: 'ENDS WITH' }
								]}
								onChange={(newValue) => {
									if (!newValue) return;
									props.onUpdateWhereClause(whereIndex, { ...whereData, operator: newValue.value });
								}}
							/>
							<AutoComplete
								options={[
									...schema.globalParams.map((param) => `#${param}`),
									...props.routeData!.request!.map((request) => `$${request.name}`)
								]}
								startSymbols={['$', '#']}
								value={whereData.value || ''}
								onChange={(newValue) => {
									if (!newValue) return;
									props.onUpdateWhereClause(whereIndex, { ...whereData, value: newValue });
								}}
							/>
						</Box>
					)}
				</React.Fragment>
			);
		});
	}

	return (
		<Box className={'rsWhereClauseInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Where Query
			</Label>
			{renderWhereStatements()}
			<Button look={'containedPrimary'} onClick={handleAddStatement} mt={16}>
				Add Statement
			</Button>
		</Box>
	);
};

export default WhereClauseInput;
