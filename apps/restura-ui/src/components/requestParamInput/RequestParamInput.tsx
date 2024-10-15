import * as React from 'react';
import './RequestParamInput.scss';
import { Box, Button, Checkbox, Icon, InputText, Label, rsToastify, Select } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useMemo, useState } from 'react';

import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-typescript';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-min-noconflict/ext-searchbox';
import { StringUtils } from '../../utils/utils.js';

interface RequestParamInputProps {
	routeData: Restura.RouteData | undefined;
}

const RequestParamInput: React.FC<RequestParamInputProps> = (props: RequestParamInputProps) => {
	const pageParams = ['page', 'perPage', 'filter', 'sortBy', 'sortOrder'];
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [newParameterName, setNewParameterName] = useState<string>('');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const typeCheckTypes = useMemo<string[]>(() => {
		return ['string', 'number', 'boolean', 'object', 'string[]', 'number[]', 'any[]'];
	}, []);

	const paramValidatorOptions = useMemo(() => {
		return [
			{ label: 'Type Check', value: 'TYPE_CHECK' },
			{ label: 'Minimum', value: 'MIN' },
			{ label: 'Maximum', value: 'MAX' },
			{ label: 'One Of', value: 'ONE_OF' }
		];
	}, []);

	const customRequestTypeOptions = useMemo<{ label: string; value: string }[]>(() => {
		if (!schema) return [];

		let matches = schema.customTypes.match(/(?<=\binterface\s)(\w+)/g);
		if (!matches) return [];
		return matches.map((item) => ({ label: item, value: item }));
	}, [schema]);

	function checkForDuplicateName(newName: string): void {
		if (!props.routeData) return;
		if (props.routeData.request && props.routeData.request.find((item) => item.name === newName)) {
			rsToastify.error('Parameter name already exists', 'Duplicate Parameter Name');
		}
	}

	function handleAddNewParameter() {
		if (!schema || !props.routeData || !props.routeData.request) return;
		if (!newParameterName) {
			rsToastify.error('Please enter a name for the new parameter', 'Missing Parameter Name');
			return;
		}

		const sanitizedName = StringUtils.sanitizeParameter(newParameterName);
		checkForDuplicateName(sanitizedName);
		if (!sanitizedName) return;
		let newParameter: Restura.RequestData = {
			name: sanitizedName,
			required: false,
			validator: [
				{
					type: 'TYPE_CHECK',
					value: 'string'
				}
			]
		};

		schemaService.updateRouteData({ ...props.routeData, request: [...props.routeData.request, newParameter] });
		setNewParameterName('');
	}

	if (!props.routeData) return null;

	function isValidValueFromType(validatorType: Restura.ValidatorData['type'], value: string): boolean {
		switch (validatorType) {
			case 'TYPE_CHECK':
				return typeCheckTypes.includes(value);
			case 'MIN':
			case 'MAX':
				return !isNaN(parseInt(value));
			default:
				return true;
		}
	}

	function parseValueFromType(
		validatorType: Restura.ValidatorData['type'],
		value: string
	): string | number | string[] | number[] {
		switch (validatorType) {
			case 'TYPE_CHECK':
				return typeCheckTypes.includes(value) ? value : 'string';
			case 'MIN':
			case 'MAX':
				return parseInt(value) || 0;
			case 'ONE_OF':
				return value.split(',');
			default:
				return value;
		}
	}

	function renderStandardRequestParameters() {
		if (!props.routeData || !props.routeData.request) return null;

		return (
			<>
				{props.routeData.request.map((requestParam, paramIndex) => {
					const isPageParam = pageParams.includes(requestParam.name) && props.routeData?.type === 'PAGED';
					return (
						<Box
							key={`${props.routeData!.path}_${requestParam.name}_${paramIndex}`}
							className={'requestParam'}
						>
							<Box className={'paramNameRequired'}>
								{!isPageParam && (
									<Icon
										iconImg={'icon-delete'}
										fontSize={16}
										className={'deleteIcon'}
										onClick={() => {
											schemaService.removeRequestParam(paramIndex);
										}}
									/>
								)}
								<InputText
									inputMode={'text'}
									placeholder={'name'}
									disabled={isPageParam}
									defaultValue={requestParam.name}
									onBlur={(newValue) => {
										if (newValue.target.value === requestParam.name) return;
										const sanitizedName = StringUtils.sanitizeParameter(newValue.target.value);
										checkForDuplicateName(sanitizedName);
										if (!sanitizedName) return;
										schemaService.updateRequestParam(paramIndex, {
											...requestParam,
											name: sanitizedName
										});
									}}
								/>
								<Checkbox
									labelText={'Required'}
									look={'containedPrimary'}
									checked={requestParam.required}
									onChange={(newValue) => {
										schemaService.updateRequestParam(paramIndex, {
											...requestParam,
											required: newValue.target.checked
										});
									}}
								/>
							</Box>
							<Box className={'paramValidators'}>
								{requestParam.validator.map((validator, validatorIndex) => {
									return (
										<Box
											display={'flex'}
											gap={8}
											key={`${validator.type}_${validatorIndex}`}
											position={'relative'}
										>
											{!isPageParam && (
												<Icon
													iconImg={'icon-delete'}
													fontSize={16}
													className={'deleteIcon'}
													onClick={() => {
														schemaService.removeValidator(paramIndex, validatorIndex);
													}}
												/>
											)}
											<Select
												value={paramValidatorOptions.find(
													(item) => item.value === validator.type
												)}
												options={paramValidatorOptions}
												isDisabled={isPageParam}
												onChange={(newValue) => {
													if (!newValue) return;
													let newValidatorType =
														newValue.value as Restura.ValidatorData['type'];
													let sanitizedValue = parseValueFromType(
														newValidatorType,
														validator.value.toString()
													);
													schemaService.updateValidator(paramIndex, validatorIndex, {
														...validator,
														type: newValidatorType,
														value: sanitizedValue
													});
												}}
											/>
											<InputText
												inputMode={'text'}
												placeholder={'value'}
												disabled={isPageParam}
												defaultValue={
													Array.isArray(validator.value)
														? validator.value.join(',')
														: validator.value
												}
												onBlur={(event) => {
													if (!isValidValueFromType(validator.type, event.target.value)) {
														rsToastify.error(
															'Invalid value for given validator type.',
															'Invalid value'
														);
														return;
													}
													let sanitizedValue = parseValueFromType(
														validator.type,
														event.target.value
													);
													schemaService.updateValidator(paramIndex, validatorIndex, {
														...validator,
														value: sanitizedValue
													});
												}}
											/>
										</Box>
									);
								})}
							</Box>
							{!isPageParam && (
								<Button
									look={'containedPrimary'}
									className={'circleButton'}
									onClick={() => {
										schemaService.addValidator(paramIndex);
									}}
								>
									<Icon iconImg={'icon-plus'} fontSize={16} mr={8} />
									Validator
								</Button>
							)}
						</Box>
					);
				})}
				<Box className={'parameterInput'}>
					<InputText
						value={newParameterName}
						onChange={(value) => setNewParameterName(value)}
						inputMode={'text'}
						placeholder={'name'}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								handleAddNewParameter();
							}
						}}
					/>
					<Button look={'outlinedPrimary'} onClick={handleAddNewParameter}>
						Add
					</Button>
				</Box>
			</>
		);
	}

	function renderCustomRequestType() {
		if (!schema) return null;
		if (!SchemaService.isCustomRouteData(props.routeData)) return null;
		let requestPreviewText = props.routeData.requestType || 'SELECT A TYPE ABOVE!!!';
		if (props.routeData.requestType)
			requestPreviewText = SchemaService.getInterfaceFromCustomTypes(
				props.routeData.requestType,
				schema.customTypes
			);

		return (
			<>
				<Select
					value={{ label: props.routeData.requestType, value: props.routeData.requestType }}
					options={customRequestTypeOptions}
					mb={32}
					onChange={(newValue) => {
						if (!newValue) return;
						if (!SchemaService.isCustomRouteData(props.routeData)) return null;
						schemaService.updateRouteData({ ...props.routeData, requestType: newValue.value });
					}}
				/>
				<AceEditor
					width={'100%'}
					fontSize={14}
					height={'500px'}
					mode="typescript"
					theme="terminal"
					name="CustomType"
					editorProps={{ $blockScrolling: true }}
					value={requestPreviewText}
					readOnly
					highlightActiveLine={false}
				/>
			</>
		);
	}

	return (
		<Box className={'rsRequestParamInput'}>
			<Box display={'flex'} alignItems={'center'} justifyContent={'space-between'}>
				<Label variant={'body1'} weight={'regular'} mb={4}>
					{!!props.routeData.request ? `Parameters (${props.routeData.request.length})` : 'Parameter Type'}
				</Label>
				{SchemaService.isCustomRouteData(props.routeData) && (
					<Checkbox
						labelText={'Standard Request'}
						look={'textPrimary'}
						labelPosition={'TOP'}
						checked={!!props.routeData.request}
						onChange={(event) => {
							if (!schema || !props.routeData) return;
							let updatedRouteData = { ...props.routeData };
							if (event.currentTarget.checked) {
								if ('requestType' in updatedRouteData) delete updatedRouteData.requestType;
								updatedRouteData.request = [];
								schemaService.updateRouteData(updatedRouteData);
							} else {
								delete updatedRouteData.request;
								schemaService.updateRouteData(updatedRouteData);
							}
						}}
					/>
				)}
			</Box>
			{!!props.routeData.request && renderStandardRequestParameters()}
			{!props.routeData.request && renderCustomRequestType()}
		</Box>
	);
};

export default RequestParamInput;
