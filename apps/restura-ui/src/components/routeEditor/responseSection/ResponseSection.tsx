import { Box, Button, Label, popupController, rsToastify, Select } from '@redskytech/framework/ui';
import * as React from 'react';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import useRouteData from '../../../customHooks/useRouteData';
import ColumnPickerPopup, { ColumnPickerPopupProps } from '../../../popups/columnPickerPopup/ColumnPickerPopup';
import SchemaService from '../../../services/schema/SchemaService';
import serviceFactory from '../../../services/serviceFactory';
import globalState from '../../../state/globalState';
import { StringUtils, WebUtils } from '../../../utils/utils';
import './ResponseSection.scss';

import AceEditor from 'react-ace';

import 'ace-builds/src-min-noconflict/ext-searchbox';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';
import EditSubqueryPopup, { EditSubqueryPopupProps } from '../../../popups/editSubqueryPopup/EditSubqueryPopup.js';
import ResponseProperty from '../../responseProperty/ResponseProperty';
import ResponseSubquery from '../../responseSubquery/ResponseSubquery.js';

interface ResponseSectionProps {}

const ResponseSection: React.FC<ResponseSectionProps> = (_props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');

	const routeData = useRouteData();

	const customResponseOptions = useMemo<{ label: string; value: string }[]>(() => {
		const options = [
			{ label: 'boolean', value: 'boolean' },
			{ label: 'string', value: 'string' },
			{ label: 'number', value: 'number' }
		];

		if (!schema) return options;

		const matches = schema.customTypes.map((customType) => {
			const matches = customType.match(/(?<=interface\s)(\w+)|(?<=type\s)(\w+)/g);
			if (matches && matches.length > 0) return matches[0];
			return '';
		});
		if (!matches) return options;
		return [...options, ...matches.map((item) => ({ label: item, value: item }))];
	}, [schema]);

	function handleAddSubquery() {
		if (!routeData) return;
		if (!SchemaService.isStandardRouteData(routeData)) return;
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
				if (!routeData) return;
				response.name = response.subquery?.table || 'unknown';
				schemaService.addResponseParameter('root', response);
			}
		});
	}

	function handleAddProperty() {
		if (!routeData) return;
		if (!SchemaService.isStandardRouteData(routeData)) return;
		popupController.open<ColumnPickerPopupProps>(ColumnPickerPopup, {
			baseTable: routeData.table,
			headerText: 'Select Column',
			onColumnSelect: async (tableWithJoinColumn, columnData) => {
				let name = '';
				let selectorBase = tableWithJoinColumn.table;
				if (!tableWithJoinColumn.joinColumn) {
					name = columnData.name;
				} else {
					name = `${selectorBase}${StringUtils.capitalizeFirst(columnData.name)}`;
					selectorBase = `${tableWithJoinColumn.joinColumn}_${tableWithJoinColumn.table}`;
					// Since we are in a closure, we need to make sure we are using the latest value of routeData
					const latestRouteData = schemaService.getSelectedRouteData() as Restura.StandardRouteData;
					if (!latestRouteData) return;
					const existingJoin = latestRouteData.joins.find(
						(join) => join.table === tableWithJoinColumn.table && join.alias === selectorBase
					);
					if (!existingJoin) {
						// Find the foreign key for this table
						const foreignKey = schemaService.getForeignKey(
							latestRouteData.table,
							tableWithJoinColumn.table
						);
						if (!foreignKey) {
							rsToastify.error(
								`Could not find foreign key for table ${latestRouteData.table} to table ${tableWithJoinColumn}`
							);
							return;
						}

						schemaService.addJoin({
							table: tableWithJoinColumn.table,
							localColumnName: foreignKey.column,
							foreignColumnName: foreignKey.refColumn,
							alias: selectorBase,
							type: 'INNER'
						});

						// We need to sleep so that recoil can update with the table join
						await WebUtils.sleep(50);
					}
				}

				schemaService.addResponseParameter('root', {
					name,
					selector: `${selectorBase}.${columnData.name}`
				});
			}
		});
	}

	function renderResponseObject(standardRouteData: Restura.StandardRouteData) {
		return standardRouteData.response.map((responseData, parameterIndex) => {
			{
				return responseData.subquery ? (
					<ResponseSubquery
						key={responseData.name}
						responseData={responseData}
						parameterIndex={parameterIndex}
						rootPath={'root'}
					/>
				) : (
					<ResponseProperty
						key={responseData.name}
						responseData={responseData}
						parameterIndex={parameterIndex}
						rootPath={'root'}
					/>
				);
			}
		});
	}

	function renderStandardResponse(standardRouteData: Restura.StandardRouteData) {
		if (standardRouteData.method === 'DELETE')
			return (
				<Label variant={'body1'} weight={'regular'}>
					Returns {'{'}data: true{'}'} on success otherwise an HTML failure code with appropriate error
					response object.
				</Label>
			);

		return (
			<>
				<Box display={'flex'} gap={8}>
					<Button look={'textPrimary'} onClick={handleAddProperty}>
						Add Property
					</Button>
					<Button look={'textPrimary'} onClick={handleAddSubquery}>
						Add Subquery
					</Button>
				</Box>
				{renderResponseObject(standardRouteData)}
			</>
		);
	}

	function renderCustomResponse(customRouteData: Restura.CustomRouteData) {
		if (!schema) return <></>;
		let responsePreviewText = customRouteData.responseType;
		if (!['boolean', 'string', 'number'].includes(customRouteData.responseType))
			responsePreviewText = SchemaService.getInterfaceFromCustomTypes(
				customRouteData.responseType,
				schema.customTypes
			);

		return (
			<Box>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					Response Type
				</Label>
				<Select
					mb={32}
					value={{ label: customRouteData.responseType, value: customRouteData.responseType }}
					options={customResponseOptions}
					onChange={(option) => {
						if (!option) return;
						schemaService.updateRouteData({
							...customRouteData,
							responseType: option.value
						});
					}}
				/>
				<AceEditor
					width={'100%'}
					fontSize={14}
					height={'calc(100vh - 500px)'}
					mode="typescript"
					theme="terminal"
					name="CustomType"
					editorProps={{ $blockScrolling: true }}
					value={responsePreviewText}
					readOnly
					highlightActiveLine={false}
				/>
			</Box>
		);
	}

	return (
		<Box className={'rsResponseSection'}>
			<Box className={'content'}>
				{SchemaService.isStandardRouteData(routeData) && renderStandardResponse(routeData)}
				{SchemaService.isCustomRouteData(routeData) && renderCustomResponse(routeData)}
			</Box>
		</Box>
	);
};

export default ResponseSection;
