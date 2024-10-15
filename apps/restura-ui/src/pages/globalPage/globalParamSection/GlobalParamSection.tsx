import * as React from 'react';
import './GlobalParamSection.scss';
import { Box, Button, Icon, InputText, Label, rsToastify } from '@redskytech/framework/ui';
import themes from '../../../themes/themes.scss?export';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import { useState } from 'react';
import cloneDeep from 'lodash.clonedeep';

interface GlobalParamSectionProps {}

const GlobalParamSection: React.FC<GlobalParamSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState<Restura.Schema | undefined>(globalState.schema);
	const [newParamName, setNewParamName] = useState<string>('');

	function handleAddNewParam() {
		if (!schema) return;
		if (!newParamName) {
			rsToastify.error('Please enter a name for the new parameter', 'Name Required');
			return;
		}

		// Make sure there are no duplicates
		if (schema.globalParams.find((item) => item === newParamName)) {
			rsToastify.error('A parameter with that name already exists', 'Duplicate Name');
			return;
		}

		// Add the new parameter
		let updatedSchema = cloneDeep(schema);
		updatedSchema.globalParams.push(newParamName);
		setSchema(updatedSchema);
		setNewParamName('');
	}

	if (!schema) return <></>;

	return (
		<Box className={'rsGlobalParamSection'}>
			<Box display={'flex'} gap={16} alignItems={'center'}>
				<Box>
					<InputText
						value={newParamName}
						inputMode={'text'}
						placeholder={'New Param'}
						onChange={(value) => setNewParamName(value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') handleAddNewParam();
						}}
					/>
					<Label variant={'caption1'} weight={'regular'} mt={4} color={themes.neutralBeige500}>
						Global Params are referenced inside the API Details using the "#" symbol. (ex. #companyId)
					</Label>
				</Box>
				<Button look={'outlinedPrimary'} onClick={handleAddNewParam}>
					Add
				</Button>
			</Box>
			<Box display={'flex'} flexDirection={'column'} gap={16} mt={16}>
				{schema.globalParams.map((globalParam) => {
					return (
						<Box key={globalParam} className={'paramItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									if (!schema) return;
									let updatedSchema = cloneDeep(schema);
									updatedSchema.globalParams = updatedSchema.globalParams.filter(
										(item) => item !== globalParam
									);
									setSchema(updatedSchema);
								}}
							/>
							<Label variant={'body1'} weight={'regular'} color={themes.neutralWhite}>
								{globalParam}
							</Label>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
};

export default GlobalParamSection;
