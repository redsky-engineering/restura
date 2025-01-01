import { Box, Button, Icon, Label, rsToastify, Select } from '@redskytech/framework/ui';
import cloneDeep from 'lodash.clonedeep';
import * as React from 'react';
import { useMemo } from 'react';
import { useRecoilState } from 'recoil';
import SchemaService from '../../../services/schema/SchemaService.js';
import globalState from '../../../state/globalState.js';
import DbTableCell from '../../dbTableCell/DbTableCell.js';
import './NotifySection.scss';

interface NotifySectionProps {
	tableName: string;
}

const NotifySection: React.FC<NotifySectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState(globalState.schema);
	const tableData = useMemo(
		() => (schema ? schema.database.find((item) => item.name === props.tableName) : undefined),
		[schema, props.tableName]
	);

	const columnNamesAvailable = useMemo(() => {
		if (!tableData) return [];
		return tableData.columns
			.map((column) => column.name)
			.filter(
				(columnName) => tableData.notify && tableData.notify !== 'ALL' && !tableData.notify.includes(columnName)
			);
	}, [tableData]);

	const defaultSelectValue = useMemo(() => {
		if (!tableData || !tableData.notify) return { label: 'None', value: 'NONE' };
		if (tableData.notify === 'ALL') return { label: 'All', value: 'ALL' };
		return { label: 'Custom', value: 'CUSTOM' };
	}, [tableData]);

	function renderNotifyData(): React.ReactNode {
		if (!tableData || !tableData.notify) return <></>;

		if (tableData.notify === 'ALL') {
			return <DbTableCell disableEdit cellType={'text'} value={'Notify on all changes'} onChange={() => {}} />;
		} else if (Array.isArray(tableData.notify)) {
			return tableData.notify.map((notifyColumnName) => {
				return (
					<React.Fragment key={notifyColumnName}>
						<DbTableCell
							cellType={'select'}
							value={notifyColumnName}
							onChange={(newColumnName) => {
								const updatedSchema = cloneDeep(schema!);
								const updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
								const notifyIndex = (updatedTableData.notify as string[]).indexOf(notifyColumnName);
								(updatedTableData.notify as string[])[notifyIndex] = newColumnName;
								setSchema(updatedSchema);
							}}
							selectOptions={columnNamesAvailable}
						/>
						<DbTableCell
							disableEdit
							cellType={'text'}
							value={'INSERT, UPDATE, DELETE'}
							onChange={() => {}}
						/>
						<Box display={'flex'} alignItems={'center'}>
							<Icon
								iconImg={'icon-delete'}
								padding={4}
								fontSize={16}
								cursorPointer
								onClick={() => {
									const updatedSchema = cloneDeep(schema!);
									const updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
									updatedTableData.notify = (updatedTableData.notify as string[]).filter(
										(item) => item !== notifyColumnName
									);
									setSchema(updatedSchema);
								}}
							/>
						</Box>
					</React.Fragment>
				);
			});
		}
	}

	function renderNotifyHeader() {
		return (
			<>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Name
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Notification Type
				</Label>
				<Box /> {/* Empty box for the delete button */}
			</>
		);
	}

	function addNewCustomNotify(): void {
		if (!tableData) return;
		const updatedSchema = cloneDeep(schema!);
		const updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
		if (updatedTableData.notify === 'ALL') {
			rsToastify.error('Cannot add custom notify when notify is set to ALL.', 'Error');
			return;
		}
		updatedTableData.notify = updatedTableData.notify || [];
		updatedTableData.notify.push(columnNamesAvailable[0]);
		setSchema(updatedSchema);
	}

	return (
		<Box className={'rsNotifySection'}>
			<Box display={'flex'} alignItems={'center'} gap={16} mt={32} mb={16}>
				<Label variant={'subheader2'} weight={'regular'}>
					Notifications
				</Label>
				<Select<{ label: string; value: string }>
					defaultValue={defaultSelectValue}
					onChange={(selection) => {
						if (!selection) return;
						const updatedSchema = cloneDeep(schema!);
						const updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
						if (selection.value === 'NONE') {
							delete updatedTableData.notify;
						} else if (selection.value === 'ALL') {
							updatedTableData.notify = 'ALL';
						} else {
							updatedTableData.notify = [];
						}

						setSchema(updatedSchema);
					}}
					options={[
						{ label: 'None', value: 'NONE' },
						{ label: 'All', value: 'ALL' },
						{ label: 'Custom', value: 'CUSTOM' }
					]}
				/>
			</Box>
			<Box className={'tableNotifyDetailsGrid'}>
				{renderNotifyHeader()}
				{renderNotifyData()}
			</Box>
			{!columnNamesAvailable.length || tableData?.notify === 'ALL' ? null : (
				<Button
					mt={8}
					look={'iconPrimary'}
					onClick={addNewCustomNotify}
					icon={[
						{
							iconImg: 'icon-plus',
							fontSize: 16,
							position: 'LEFT'
						}
					]}
				/>
			)}
		</Box>
	);
};

export default NotifySection;
