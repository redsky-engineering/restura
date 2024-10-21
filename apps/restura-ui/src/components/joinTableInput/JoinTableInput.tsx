import * as React from 'react';
import './JoinTableInput.scss';
import { Box, Button, Icon, Label, popupController, Select } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import JoinSelectorPopup, { JoinSelectorPopupProps } from '../../popups/joinSelectorPopup/JoinSelectorPopup';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import AutoComplete from '../autoComplete/AutoComplete';
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
			onSelect: (type, localColumn, foreignTable, foreignColumn) => {
				let newJoin: Restura.JoinData = {
					type: 'INNER',
					table: foreignTable,
					...(type === 'STANDARD' && {
						foreignColumnName: foreignColumn,
						localColumnName: localColumn
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
				<Box key={props.routeData!.path + '_' + joinData.table} className={'joinItem'}>
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
								{props.baseTableName}.{joinData.localColumnName}
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
									let updatedJoinData = { ...joinData };
									updatedJoinData.custom = `${props.baseTableName}.${joinData.localColumnName} = ${joinData.table}.${joinData.foreignColumnName}`;
									delete updatedJoinData.localColumnName;
									delete updatedJoinData.foreignColumnName;
									props.onUpdateJoin(joinIndex, updatedJoinData);
								}}
							/>
						</Box>
					) : (
						<AutoComplete
							options={
								[
									...schema.globalParams.map((param) => `#${param}`),
									...props.routeData.request.map((request) => `$${request.name}`)
								] || []
							}
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
