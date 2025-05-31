import { Box, Button, Icon, InputText, Label, rsToastify } from '@redskytech/framework/ui';
import cloneDeep from 'lodash.clonedeep';
import * as React from 'react';
import { useState } from 'react';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import themes from '../../../themes/themes.scss?export';
import './ScopeSection.scss';

interface ScopeSectionProps {}

const ScopeSection: React.FC<ScopeSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState<Restura.Schema | undefined>(globalState.schema);
	const [newScopeName, setNewScopeName] = useState<string>('');

	function handleAddScope() {
		if (!schema) return;
		if (!newScopeName) {
			rsToastify.error('Please enter a name for the new scope', 'Name Required');
			return;
		}

		// Make sure there are no duplicates
		if (schema.scopes.find((item) => item === newScopeName)) {
			rsToastify.error('A scope with that name already exists', 'Duplicate Name');
			return;
		}

		// Add the new scope
		let updatedSchema = cloneDeep(schema);
		updatedSchema.scopes.push(newScopeName);
		setSchema(updatedSchema);
		setNewScopeName('');
	}

	if (!schema) return <></>;

	return (
		<Box className={'rsScopeSection'}>
			<Box display={'flex'} gap={16} alignItems={'center'}>
				<Box width={'100%'}>
					<InputText
						value={newScopeName}
						inputMode={'text'}
						placeholder={'New Scope (e.g. read:user, write:admin, etc.)'}
						onChange={(value) => setNewScopeName(value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') handleAddScope();
						}}
					/>
				</Box>
				<Button look={'outlinedPrimary'} onClick={handleAddScope}>
					Add
				</Button>
			</Box>
			<Box display={'flex'} flexDirection={'column'} gap={16} mt={16}>
				{schema.scopes.map((scope) => {
					return (
						<Box key={scope} className={'scopeItem'}>
							<Icon
								iconImg={'icon-delete'}
								fontSize={16}
								className={'deleteIcon'}
								onClick={() => {
									if (!schema) return;
									let updatedSchema = cloneDeep(schema);
									updatedSchema.scopes = updatedSchema.scopes.filter((item) => item !== scope);
									setSchema(updatedSchema);
								}}
							/>
							<Label variant={'body1'} weight={'regular'} color={themes.neutralWhite}>
								{scope}
							</Label>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
};

export default ScopeSection;
