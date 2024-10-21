import * as React from 'react';
import './ResponseSubquery.scss';
import { Box, Button, Icon, InputText, Label, popupController, rsToastify } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useState } from 'react';
import themes from '../../themes/themes.scss?export';
import ResponseProperty from '../responseProperty/ResponseProperty';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../popups/columnPickerPopup/ColumnPickerPopup';
import EditSubqueryPopup, { EditSubqueryPopupProps } from '../../popups/editSubqueryPopup/EditSubqueryPopup.js';
import { StringUtils, WebUtils } from '../../utils/utils.js';
import cloneDeep from 'lodash.clonedeep';

interface ResponseSubqueryProps {
	responseData: Restura.ResponseData;
	parameterIndex: number;
	rootPath: string;
}

const ResponseSubquery: React.FC<ResponseSubqueryProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [isEditingAlias, setIsEditingAlias] = useState<boolean>(false);

	function handleAddSubquery() {
		if (!props.responseData.subquery) return;
		popupController.open<EditSubqueryPopupProps>(EditSubqueryPopup, {
			response: {
				name: '', // Name will be assigned on save based on table name
				subquery: {
					table: '',
					joins: [],
					where: [],
					properties: []
				}
			},
			onSave: (response: Restura.ResponseData) => {
				response.name = response.subquery?.table || 'unknown';
				schemaService.addResponseParameter(`${props.rootPath}.${props.responseData.name}`, response);
			}
		});
	}

	function handleAddProperty() {
		if (!props.responseData.subquery) return;
		popupController.open<ColumnPickerPopupProps>(ColumnPickerPopup, {
			baseTable: props.responseData.subquery.table,
			headerText: 'Select Column',
			onColumnSelect: async (tableWithJoinColumn, columnData) => {
				if (!props.responseData.subquery) return;
				let name = '';
				let selectorBase = tableWithJoinColumn.table;
				if (!tableWithJoinColumn.joinColumn) {
					name = columnData.name;
				} else {
					name = `${selectorBase}${StringUtils.capitalizeFirst(columnData.name)}`;
					let latestResponseData = schemaService.getResponseParameter(props.rootPath, props.parameterIndex);
					if (!latestResponseData || !latestResponseData.subquery) return;
					let existingJoin = latestResponseData.subquery.joins.find(
						(join) => join.table === tableWithJoinColumn.table && join.alias === selectorBase
					);
					if (!existingJoin) {
						// Find the foreign key for this table
						let foreignKey = schemaService.getForeignKey(
							props.responseData.subquery.table,
							tableWithJoinColumn.table
						);
						if (!foreignKey) {
							rsToastify.error(
								`Could not find foreign key for table ${props.responseData.subquery.table} to table ${tableWithJoinColumn}`
							);
							return;
						}

						let updatedResponse = cloneDeep(latestResponseData)!;
						updatedResponse.subquery!.joins.push({
							table: tableWithJoinColumn.table,
							localColumnName: foreignKey.column,
							foreignColumnName: foreignKey.refColumn,
							type: 'INNER',
							alias: selectorBase
						});
						schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, updatedResponse);

						// We need to sleep so that recoil can update with the table join
						await WebUtils.sleep(50);
					}
				}

				schemaService.addResponseParameter(`${props.rootPath}.${props.responseData.name}`, {
					name,
					selector: `${selectorBase}.${columnData.name}`
				});
			}
		});
	}

	function handleEditSubquery() {
		if (!props.responseData.subquery) return;
		popupController.open<EditSubqueryPopupProps>(EditSubqueryPopup, {
			response: props.responseData,
			onSave: (response) => {
				schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, response);
			}
		});
	}

	return (
		<Box className={'rsResponseSubquery'}>
			<Box className={'header'}>
				<Icon
					fontSize={16}
					iconImg={'icon-delete'}
					className={'deleteIcon'}
					onClick={() => {
						schemaService.removeResponseParameter(props.rootPath, props.parameterIndex);
					}}
					cursorPointer
				/>
				<Box>
					{isEditingAlias ? (
						<InputText
							inputMode={'text'}
							autoFocus
							onBlur={(event) => {
								setIsEditingAlias(false);
								schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
									...props.responseData,
									name: event.currentTarget.value
								});
							}}
							onKeyDown={(event) => {
								if (event.key === 'Escape') {
									setIsEditingAlias(false);
									return;
								} else if (event.key === 'Enter') {
									setIsEditingAlias(false);
									schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
										...props.responseData,
										name: event.currentTarget.value
									});
								}
							}}
							defaultValue={props.responseData.name}
						/>
					) : (
						<Label
							variant={'body1'}
							weight={'regular'}
							className={'responseAlias'}
							onClick={() => setIsEditingAlias(true)}
						>
							{props.responseData.name}: {`{}`}[]
						</Label>
					)}
					<Label variant={'caption2'} weight={'regular'} color={themes.neutralBeige600}>
						Object Array
					</Label>
				</Box>
				<Button look={'textPrimary'} onClick={handleAddProperty}>
					Add Property
				</Button>
				<Button look={'textPrimary'} onClick={handleAddSubquery}>
					Add Subquery
				</Button>
				<Icon
					iconImg={'icon-edit'}
					fontSize={20}
					color={themes.neutralBeige600}
					cursorPointer
					onClick={handleEditSubquery}
				/>
			</Box>
			<Box pl={40}>
				{props.responseData.subquery?.properties.map((item, parameterIndex) => {
					if (item.subquery) {
						return (
							<ResponseSubquery
								key={item.name}
								responseData={item}
								parameterIndex={parameterIndex}
								rootPath={`${props.rootPath}.${props.responseData.name}`}
							/>
						);
					} else {
						return (
							<ResponseProperty
								key={item.name}
								responseData={item}
								parameterIndex={parameterIndex}
								rootPath={`${props.rootPath}.${props.responseData.name}`}
							/>
						);
					}
				})}
			</Box>
		</Box>
	);
};

export default ResponseSubquery;
