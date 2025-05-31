import {
	Box,
	Button,
	Icon,
	InputText,
	Label,
	Popup,
	popupController,
	PopupProps,
	rsToastify
} from '@redskytech/framework/ui';
import classNames from 'classnames';
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRecoilValue } from 'recoil';
import SchemaService from '../../services/schema/SchemaService';
import globalState from '../../state/globalState';
import themes from '../../themes/themes.scss?export';
import './ColumnPickerPopup.scss';

export type TableWithJoinColumn = { table: string; joinColumn?: string };

export interface ColumnPickerPopupProps extends PopupProps {
	baseTable: string;
	headerText: string;
	baseTableOnly?: boolean;
	onColumnSelect: (tableWithJoinColumn: TableWithJoinColumn, columnData: Restura.ColumnData) => void;
	onCustomSelect?: () => void;
	autoCloseOnSelect?: boolean;
	joins?: { table: string }[];
}

const ColumnPickerPopup: React.FC<ColumnPickerPopupProps> = (props) => {
	const [filterValue, setFilterValue] = useState<string>('');

	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [selectedTable, setSelectedTable] = useState<TableWithJoinColumn | undefined>();

	const tableOptions = useMemo<{ table: string; joinColumn?: string }[]>(() => {
		if (!schema) return [];
		let table = schema.database.find((item) => item.name === props.baseTable);
		if (!table) return [];

		let options = [
			{ table: props.baseTable },
			...table.foreignKeys.map((item) => ({ table: item.refTable, joinColumn: item.column }))
		];

		// Add options from existing joins
		if (props.joins) {
			console.log('props.joins', props.joins);
			props.joins.forEach((join) => {
				const joinedTable = schema.database.find((item) => item.name === join.table);
				if (joinedTable) {
					options = [
						...options,
						...joinedTable.foreignKeys.map((item) => ({
							table: item.refTable,
							joinColumn: item.column
						}))
					];
				}
			});
		}

		return options;
	}, [schema, props.baseTable, props.joins]);

	useEffect(() => {
		if (tableOptions.length === 0) return;
		if (selectedTable) return;
		setSelectedTable(tableOptions[0]);
	}, [tableOptions]);

	function handleClose() {
		popupController.close(ColumnPickerPopup);
	}

	function handleCustom() {
		props.onCustomSelect!();
		popupController.close(ColumnPickerPopup);
	}

	function handleColumnClick(tableData: Restura.TableData, columnData: Restura.ColumnData) {
		if (!selectedTable) return;
		props.onColumnSelect(selectedTable, columnData);
		if (props.autoCloseOnSelect) handleClose();
		rsToastify.success(`${selectedTable.table}.${columnData.name} - added`, 'Added Column');
	}

	function handleAddAll() {
		if (!schema || !selectedTable) return;
		let foundTable = schema.database.find((item) => item.name === selectedTable.table);
		if (!foundTable) return null;
		let filteredColumns = foundTable.columns.filter((columnData) => {
			if (filterValue === '') return true;
			return columnData.name.includes(filterValue);
		});

		filteredColumns.forEach((columnData, index) => {
			// We have to delay because the recoil value will not be updated if we fired the event too quickly
			setTimeout(() => {
				props.onColumnSelect(selectedTable, columnData);
			}, 100 * index);
		});

		setTimeout(() => {
			rsToastify.success(`Multiple columns added`, 'Added All Columns');
			if (props.autoCloseOnSelect) handleClose();
		}, 100 * filteredColumns.length);
	}

	function renderFilter() {
		return (
			<Box className={'filter'}>
				<InputText
					placeholder={'Search Columns'}
					inputMode={'search'}
					value={filterValue}
					onChange={(newValue) => {
						setFilterValue(newValue);
					}}
					icon={[
						{
							iconImg: 'icon-filter-list',
							fontSize: 16,
							position: 'LEFT',
							marginRight: 8,
							color: themes.neutralBeige500
						}
					]}
				/>
			</Box>
		);
	}

	function renderTableList() {
		return tableOptions.map((table) => {
			return (
				<Box
					key={`${table.table}_${table.joinColumn}`}
					className={classNames('tableListItem', { isSelected: table === selectedTable })}
					onClick={() => {
						if (table === selectedTable) return;
						setSelectedTable(table);
					}}
				>
					<Label variant={'caption1'} weight={'regular'}>
						{table.table}
						{!!table.joinColumn && ` (${table.joinColumn})`}
					</Label>
				</Box>
			);
		});
	}

	function renderColumnList() {
		if (!schema || !selectedTable) return null;
		let foundTable = schema.database.find((item) => item.name === selectedTable.table);
		if (!foundTable) return null;
		return foundTable.columns
			.filter((columnData) => {
				if (filterValue === '') return true;
				return columnData.name.includes(filterValue);
			})
			.map((columnData) => {
				return (
					<Box
						key={columnData.name}
						className={'columnListItem'}
						onClick={() => handleColumnClick(foundTable!, columnData)}
					>
						<Label variant={'caption1'} weight={'regular'}>
							{columnData.name}
						</Label>
						<Label variant={'caption2'} weight={'regular'} color={themes.neutralBeige600}>
							{SchemaService.convertSqlTypeToTypescriptType(columnData.type)}
							{columnData.isNullable ? ' | null' : ''}
						</Label>
					</Box>
				);
			});
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsColumnPickerPopup'}>
				<Box className={'header'}>
					<Label variant={'h4'} color={themes.neutralWhite} weight={'medium'}>
						{props.headerText}
					</Label>
					<Icon
						iconImg={'icon-close'}
						color={themes.neutralWhite}
						onClick={handleClose}
						cursorPointer
						p={4}
						fontSize={16}
					/>
				</Box>
				<Box p={24} height={'calc(60vh - 64px)'}>
					{renderFilter()}
					<Box className={'content'}>
						<Box className={'tableList'}>
							{renderTableList()}
							{!!props.onCustomSelect && (
								<Box className={'customButton'}>
									<Button look={'containedPrimary'} onClick={handleCustom} small>
										Custom
									</Button>
								</Box>
							)}
							<Box className={'footer'} />
						</Box>
						<Box className={'columnList'}>
							<Box className={'addAllBtn columnListItem'} onClick={handleAddAll}>
								<Icon iconImg={'icon-plus'} fontSize={16} />
								<Label variant={'caption1'} weight={'regular'}>
									Add All
								</Label>
							</Box>
							{renderColumnList()}
							<Box className={'columnListFooter'} />
						</Box>
					</Box>
				</Box>
			</Box>
		</Popup>
	);
};

export default ColumnPickerPopup;
