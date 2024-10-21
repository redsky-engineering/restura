import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import useJoinedColumnList from '../../customHooks/useJoinedColumnList';

interface GroupByInputProps {
	baseTableName: string;
	joins: Restura.JoinData[];
	groupBy: Restura.GroupByData | undefined;
	onUpdate: (updatedGroupBy: Restura.GroupByData | undefined) => void;
}

const GroupByInput: React.FC<GroupByInputProps> = (props) => {
	const joinedColumnList = useJoinedColumnList(props.baseTableName, props.joins);

	function getGroupByValue() {
		if (!props.groupBy) return { value: 'not grouped', label: 'not grouped' };
		const groupBy = props.groupBy;
		return {
			value: `${groupBy.tableName}.${groupBy.columnName}`,
			label: `${groupBy.tableName}.${groupBy.columnName}`
		};
	}

	function getGroupByOptions() {
		let options: { value: string; label: string }[] = [{ value: 'not grouped', label: 'not grouped' }];
		options = options.concat(
			joinedColumnList.map((column) => {
				return {
					value: `${column.tableName}.${column.columnName}`,
					label: `${column.tableName}.${column.columnName}`
				};
			})
		);
		return options;
	}

	return (
		<Box className={'rsGroupByInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Group By
			</Label>
			<Select
				value={getGroupByValue()}
				options={getGroupByOptions()}
				onChange={(newValue) => {
					if (!newValue) return;

					if (newValue.value === 'not grouped') {
						props.onUpdate(undefined);
						return;
					}

					props.onUpdate({
						tableName: newValue.value.split('.')[0],
						columnName: newValue.value.split('.')[1]
					});
				}}
			/>
		</Box>
	);
};

export default GroupByInput;
