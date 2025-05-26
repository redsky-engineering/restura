import { Box, Button, Icon, Label, popupController, rsToastify, Select } from '@redskytech/framework/ui';
import * as React from 'react';
import { useRecoilValue } from 'recoil';
import JoinSelectorPopup, { JoinSelectorPopupProps } from '../../popups/joinSelectorPopup/JoinSelectorPopup';
import globalState from '../../state/globalState';
import AutoComplete from '../autoComplete/AutoComplete';
import './JoinTableInput.scss';
import JoinData = Restura.JoinData;

interface JoinTableInputProps {
	routeData: Restura.StandardRouteData;
	baseTableName: string;
	joins: JoinData[];
	onAddJoin: (join: JoinData) => void;
	onRemoveJoin: (joinIndex: number) => void;
	onUpdateJoin: (joinIndex: number, join: JoinData) => void;
}

const JoinTableInput: React.FC<JoinTableInputProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	function handleAddJoin() {
		popupController.open<JoinSelectorPopupProps>(JoinSelectorPopup, {
			baseTable: props.baseTableName,
			joins: props.joins,
			onSelect: (type, localTable, localTableAlias, localColumn, foreignTable, foreignColumn) => {
				// Check if there is already a join that has the same table and columns
				// If so, don't add the join
				if (
					props.joins.some(
						(joinData) =>
							joinData.table === foreignTable &&
							joinData.localColumnName === localColumn &&
							joinData.foreignColumnName === foreignColumn
					)
				) {
					rsToastify.error('Duplicate Join', 'Join already exists');
					return;
				}

				const newJoin: Restura.JoinData = {
					type: 'INNER',
					table: foreignTable,
					alias: type === 'STANDARD' ? `${localColumn}_${foreignTable}` : `custom_${foreignTable}`,
					...(type === 'STANDARD' && {
						foreignColumnName: foreignColumn,
						localColumnName: localColumn,
						...(localTable && { localTable }),
						...(localTableAlias && { localTableAlias })
					}),
					...(type === 'CUSTOM' && {
						custom: `${props.baseTableName}.${localColumn} = ${foreignTable}.${foreignColumn}`
					})
				};
				props.onAddJoin(newJoin);
			}
		});
	}

	function renderJoins() {
		if (!schema) return <></>;
		if (props.joins.length === 0)
			return (
				<Label variant={'body1'} weight={'bold'}>
					No Joins
				</Label>
			);
		return props.joins.map((joinData: Restura.JoinData, joinIndex) => {
			return (
				// Use a random key since we don't have a unique identifier for each join statement
				// For example they might have the same table and columns but different aliases
				// But they might not have set the aliases yet which gets us into a bad state with the key
				<Box key={Math.random() * 10000} className={'joinItem'}>
					<Icon
						iconImg={'icon-delete'}
						fontSize={16}
						className={'deleteIcon'}
						onClick={() => {
							props.onRemoveJoin(joinIndex);
						}}
					/>
					<Box className={'tableName'}>
						<Label variant={'body1'} weight={'regular'}>
							{joinData.table}
							{!!joinData.alias && ` (${joinData.alias})`}
						</Label>
					</Box>
					{!joinData.custom ? (
						<Box className={'standardJoin'}>
							<Label variant={'body1'} weight={'regular'} className={'keyword'}>
								{joinData.localTable ? joinData.localTable : props.baseTableName}.
								{joinData.localColumnName}
							</Label>
							<Label variant={'body1'} weight={'regular'}>
								on
							</Label>
							<Label variant={'body1'} weight={'regular'} className={'keyword'}>
								{joinData.table}.{joinData.foreignColumnName}
							</Label>
							<Icon
								padding={4}
								iconImg={'icon-edit'}
								fontSize={16}
								cursorPointer
								onClick={() => {
									const updatedJoinData = { ...joinData };
									updatedJoinData.custom = `${props.baseTableName}.${joinData.localColumnName} = ${joinData.table}.${joinData.foreignColumnName}`;
									delete updatedJoinData.localColumnName;
									delete updatedJoinData.foreignColumnName;
									props.onUpdateJoin(joinIndex, updatedJoinData);
								}}
							/>
						</Box>
					) : (
						<AutoComplete
							options={[
								...schema.globalParams.map((param) => `#${param}`),
								...props.routeData.request.map((request) => `$${request.name}`)
							]}
							startSymbols={['$', '#']}
							value={joinData.custom || ''}
							maxDisplay={5}
							onChange={(newValue) => {
								if (!newValue) return;
								props.onUpdateJoin(joinIndex, { ...joinData, custom: newValue });
							}}
						/>
					)}
					<Select
						value={{ value: joinData.type, label: joinData.type }}
						options={[
							{ value: 'INNER', label: 'INNER' },
							{ value: 'LEFT', label: 'LEFT' }
						]}
						onChange={(newValue) => {
							if (!newValue) return;
							props.onUpdateJoin(joinIndex, { ...joinData, type: newValue.value });
						}}
					/>
				</Box>
			);
		});
	}

	return (
		<Box className={'rsJoinTableInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Joins
			</Label>
			{renderJoins()}
			<Button look={'containedPrimary'} onClick={handleAddJoin} mt={16}>
				Add Join
			</Button>
		</Box>
	);
};

export default JoinTableInput;
