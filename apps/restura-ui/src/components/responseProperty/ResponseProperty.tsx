import { Box, Icon, InputText, Label } from '@redskytech/framework/ui';
import * as React from 'react';
import { useState } from 'react';
import SchemaService from '../../services/schema/SchemaService';
import serviceFactory from '../../services/serviceFactory';
import themes from '../../themes/themes.scss?export';
import './ResponseProperty.scss';

interface ResponsePropertyProps {
	responseData: Restura.ResponseData;
	parameterIndex: number;
	rootPath: string;
}

const ResponseProperty: React.FC<ResponsePropertyProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [isEditingAlias, setIsEditingAlias] = useState<boolean>(false);
	const [isEditingSelector, setIsEditingSelector] = useState<boolean>(false);
	const [isEditingType, setIsEditingType] = useState<boolean>(false);

	function getTypeForResponseProperty(): string {
		if (props.responseData.type) return props.responseData.type;
		return SchemaService.getTypeForResponseProperty(props.responseData.selector || '');
	}

	function handleClickSelector(): void {
		console.log('handleClickSelector', props.responseData.type);
		if (!props.responseData.type) return;
		setIsEditingSelector(true);
	}

	function handleClickType(): void {
		if (!props.responseData.type) return;
		setIsEditingType(true);
	}

	return (
		<Box className={'rsResponseProperty'}>
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
						{props.responseData.name}:
					</Label>
				)}
				{isEditingType ? (
					<InputText
						inputMode={'text'}
						autoFocus
						onBlur={(event) => {
							setIsEditingType(false);
							schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
								...props.responseData,
								type: event.currentTarget.value
							});
						}}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								setIsEditingType(false);
								return;
							} else if (event.key === 'Enter') {
								setIsEditingType(false);
								schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
									...props.responseData,
									type: event.currentTarget.value
								});
							}
						}}
						defaultValue={props.responseData.type}
					/>
				) : (
					<Label
						variant={'caption2'}
						weight={'regular'}
						color={themes.neutralBeige600}
						onClick={handleClickType}
					>
						{getTypeForResponseProperty()}
					</Label>
				)}
			</Box>
			{isEditingSelector ? (
				<InputText
					inputMode={'text'}
					autoFocus
					onBlur={(event) => {
						setIsEditingSelector(false);
						schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
							...props.responseData,
							selector: event.currentTarget.value
						});
					}}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							setIsEditingSelector(false);
							return;
						} else if (event.key === 'Enter') {
							setIsEditingSelector(false);
							schemaService.updateResponseParameter(props.rootPath, props.parameterIndex, {
								...props.responseData,
								selector: event.currentTarget.value
							});
						}
					}}
					defaultValue={props.responseData.selector}
				/>
			) : (
				<Label
					variant={'body1'}
					weight={'regular'}
					color={themes.secondaryOrange500}
					p={8}
					onClick={handleClickSelector}
				>
					{props.responseData.selector}
				</Label>
			)}
		</Box>
	);
};

export default ResponseProperty;
