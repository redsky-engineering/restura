import * as React from 'react';
import './RoleSection.scss';
import { Box, Button, Icon, InputText, Label, rsToastify } from '@redskytech/framework/ui';
import themes from '../../../themes/themes.scss?export';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import { useState } from 'react';
import cloneDeep from 'lodash.clonedeep';

interface RoleSectionProps {}

const RoleSection: React.FC<RoleSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState<Restura.Schema | undefined>(globalState.schema);
	const [newRoleName, setNewRoleName] = useState<string>('');

	function handleAddRole() {
		if (!schema) return;
		if (!newRoleName) {
			rsToastify.error('Please enter a name for the new role', 'Name Required');
			return;
		}

		// Make sure there are no duplicates
		if (schema.roles.find((item) => item === newRoleName)) {
			rsToastify.error('A role with that name already exists', 'Duplicate Name');
			return;
		}

		// Add the new role
		let updatedSchema = cloneDeep(schema);
		updatedSchema.roles.push(newRoleName);
		setSchema(updatedSchema);
		setNewRoleName('');
	}

	if (!schema) return <></>;

	return (
		<Box className={'rsRoleSection'}>
			<Box display={'flex'} gap={16} alignItems={'center'}>
				<Box width={'100%'}>
					<InputText
						value={newRoleName}
						inputMode={'text'}
						placeholder={'New Param'}
						onChange={(value) => setNewRoleName(value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') handleAddRole();
						}}
					/>
				</Box>
				<Button look={'outlinedPrimary'} onClick={handleAddRole}>
					Add
				</Button>
			</Box>
			<Box display={'flex'} flexDirection={'column'} gap={16} mt={16}>
				{schema.roles.map((role) => {
					return (
						<Box key={role} className={'roleItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									if (!schema) return;
									let updatedSchema = cloneDeep(schema);
									updatedSchema.roles = updatedSchema.roles.filter((item) => item !== role);
									setSchema(updatedSchema);
								}}
							/>
							<Label variant={'body1'} weight={'regular'} color={themes.neutralWhite}>
								{role}
							</Label>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
};

export default RoleSection;
