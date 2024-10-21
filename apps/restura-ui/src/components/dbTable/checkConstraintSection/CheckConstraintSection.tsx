import * as React from 'react';
import './CheckConstraintSection.scss';
import { Box, Button, Icon, Label, rsToastify } from '@redskytech/framework/ui';
import { useRecoilState } from 'recoil';
import globalState from '../../../state/globalState';
import cloneDeep from 'lodash.clonedeep';
import SchemaService from '../../../services/schema/SchemaService.js';
import DbTableCell from '../../dbTableCell/DbTableCell';

interface CheckConstraintSectionProps {
	tableName: string;
}

const CheckConstraintSection: React.FC<CheckConstraintSectionProps> = (props) => {
	const [schema, setSchema] = useRecoilState(globalState.schema);

	function hasDuplicateConstraintName(newName: string, tableData: Restura.TableData) {
		return tableData.checkConstraints.find((item) => item.name === newName) !== undefined;
	}

	function renderCheckConstraintsHeader() {
		return (
			<>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Name
				</Label>
				<Label mb={8} variant={'caption1'} weight={'semiBold'}>
					Constraint
				</Label>
				<Box /> {/* Empty box for the delete button */}
			</>
		);
	}

	function renderCheckConstraints() {
		if (!schema) return <></>;
		let tableData = schema.database.find((item) => item.name === props.tableName);
		if (!tableData) return <></>;
		return tableData.checkConstraints.map((keyData) => {
			return (
				<React.Fragment key={keyData.name}>
					<DbTableCell
						cellType={'text'}
						value={keyData.name}
						onChange={(value) => {
							if (value === keyData.name) return;
							if (hasDuplicateConstraintName(value, tableData!)) {
								rsToastify.error('Constraint name already exists.', 'Duplicate Constraint Name');
								return;
							}

							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);

							const constraintIndex = updatedTableData.checkConstraints.findIndex(
								(item) => item.name === keyData.name
							);
							if (constraintIndex === -1) {
								rsToastify.error('Could not find constraint to rename.', 'Error');
								return;
							}
							updatedTableData.checkConstraints[constraintIndex].name = value;
							setSchema(updatedSchema);
						}}
					/>
					<DbTableCell
						cellType={'text'}
						value={keyData.check}
						onChange={(value) => {
							let updatedSchema = cloneDeep(schema);
							let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);

							const constraintIndex = updatedTableData.checkConstraints.findIndex(
								(item) => item.name === keyData.name
							);
							if (constraintIndex === -1) {
								rsToastify.error('Could not find constraint to rename.', 'Error');
								return;
							}

							updatedTableData.checkConstraints[constraintIndex].check = value;
							setSchema(updatedSchema);
						}}
					/>
					<Box display={'flex'} alignItems={'center'}>
						<Icon
							iconImg={'icon-delete'}
							padding={4}
							fontSize={16}
							cursorPointer
							onClick={() => {
								let updatedSchema = cloneDeep(schema);
								let updatedTableData = SchemaService.getTableData(updatedSchema, props.tableName);
								updatedTableData.checkConstraints = updatedTableData.checkConstraints.filter(
									(item) => item.name !== keyData.name
								);
								setSchema(updatedSchema);
							}}
						/>
					</Box>
				</React.Fragment>
			);
		});
	}

	function addNewConstraint() {
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		let tableData = SchemaService.getTableData(updatedSchema, props.tableName);
		tableData.checkConstraints.push({
			name: `${props.tableName}_check_${tableData.checkConstraints.length + 1}`,
			check: 'MISSING!'
		});
		setSchema(updatedSchema);
	}

	return (
		<Box className={'rsCheckConstraintSection'}>
			<Label variant={'subheader2'} weight={'regular'} mt={32} mb={16}>
				Check Constraints
			</Label>
			<Box className={'tableCheckConstraintsDetailsGrid'}>
				{renderCheckConstraintsHeader()}
				{renderCheckConstraints()}
			</Box>
			<Button
				mt={8}
				look={'iconPrimary'}
				onClick={addNewConstraint}
				icon={[
					{
						iconImg: 'icon-plus',
						fontSize: 16,
						position: 'LEFT'
					}
				]}
			/>
		</Box>
	);
};

export default CheckConstraintSection;
