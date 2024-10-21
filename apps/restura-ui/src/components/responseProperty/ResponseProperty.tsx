import * as React from 'react';
import './ResponseProperty.scss';
import { Box, Icon, InputText, Label } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useState } from 'react';
import themes from '../../themes/themes.scss?export';

interface ResponsePropertyProps {
	responseData: Restura.ResponseData;
	parameterIndex: number;
	rootPath: string;
}

const ResponseProperty: React.FC<ResponsePropertyProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const [isEditingAlias, setIsEditingAlias] = useState<boolean>(false);

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
				<Label variant={'caption2'} weight={'regular'} color={themes.neutralBeige600}>
					{SchemaService.getTypeForResponseProperty(props.responseData.selector || '')}
				</Label>
			</Box>
			<Label variant={'body1'} weight={'regular'} color={themes.secondaryOrange500} p={8}>
				{props.responseData.selector}
			</Label>
		</Box>
	);
};

export default ResponseProperty;
