import * as React from 'react';
import './DbTable.scss';
import { Box, Icon, InputText, Label, popupController } from '@redskytech/framework/ui';
import Paper from '../paper/Paper';
import { useRecoilState } from 'recoil';
import globalState from '../../state/globalState';
import { useState } from 'react';
import cloneDeep from 'lodash.clonedeep';
import ForeignKeySection from './foreignKeySection/ForeignKeySection';
import IndexSection from './indexSection/IndexSection';
import ConfirmationPopup, { ConfirmationPopupProps } from '../../popups/confirmationPopup/ConfirmationPopup';
import ColumnSection from './columnSection/ColumnSection';
import CheckConstraintSection from './checkConstraintSection/CheckConstraintSection.js';

interface DbTableProps {
	tableName: string;
	hideColumns: boolean;
	hideIndexes: boolean;
	hideForeignKeys: boolean;
	hideChecks: boolean;
}

const DbTable: React.FC<DbTableProps> = (props) => {
	const [isEditingTableName, setIsEditingTableName] = useState<boolean>(false);
	const [schema, setSchema] = useRecoilState(globalState.schema);

	function onDeleteTable() {
		popupController.open<ConfirmationPopupProps>(ConfirmationPopup, {
			label: `Are you sure you want to delete table (${props.tableName})`,
			headerLabel: 'Delete Table',
			acceptLabel: 'Delete',
			rejectLabel: 'Cancel',
			onAccept: () => {
				if (!schema) return;
				let updatedSchema = cloneDeep(schema);
				updatedSchema.database = updatedSchema.database.filter((table) => table.name !== props.tableName);
				setSchema(updatedSchema);
			}
		});
	}

	function changeTableName(newName: string) {
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let tableData = updatedSchema.database.find((table) => table.name === props.tableName)!;
		tableData.name = newName;
		setSchema(updatedSchema);
	}

	function onBlur(event: React.FocusEvent<HTMLInputElement>) {
		changeTableName(event.target.value);
		setIsEditingTableName(false);
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			changeTableName(event.currentTarget.value);
			setIsEditingTableName(false);
		} else if (event.key === 'Tab') {
			event.stopPropagation();
			event.preventDefault();
			changeTableName(event.currentTarget.value);
			setIsEditingTableName(false);
		}
	}

	return (
		<Box className={'rsDbTable'}>
			<Paper>
				<Box display={'flex'} justifyContent={'space-between'} mb={32}>
					<Box display={'flex'} alignItems={'center'}>
						{isEditingTableName ? (
							<InputText
								defaultValue={props.tableName}
								inputMode={'text'}
								onBlur={onBlur}
								autoFocus
								onKeyDown={onKeyDown}
							/>
						) : (
							<Label variant={'subheader2'} weight={'regular'}>
								{props.tableName}
							</Label>
						)}
						<Icon
							ml={8}
							iconImg={'icon-edit'}
							fontSize={16}
							cursorPointer
							onClick={() => setIsEditingTableName(true)}
						/>
					</Box>
					<Icon ml={8} iconImg={'icon-delete'} fontSize={16} cursorPointer onClick={onDeleteTable} />
				</Box>
				{!props.hideColumns && <ColumnSection tableName={props.tableName} />}
				{!props.hideIndexes && <IndexSection tableName={props.tableName} />}
				{!props.hideForeignKeys && <ForeignKeySection tableName={props.tableName} />}
				{!props.hideChecks && <CheckConstraintSection tableName={props.tableName} />}
			</Paper>
		</Box>
	);
};

export default DbTable;
