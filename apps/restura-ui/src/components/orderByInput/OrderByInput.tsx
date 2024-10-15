import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import './OrderByInput.scss';
import useJoinedColumnList from '../../customHooks/useJoinedColumnList';

interface OrderByInputProps {
	baseTableName: string;
	joins: Restura.JoinData[];
	orderBy: Restura.OrderByData | undefined;
	onUpdate: (updatedOrderBy: Restura.OrderByData | undefined) => void;
}

const OrderByInput: React.FC<OrderByInputProps> = (props) => {
	const joinedColumnList = useJoinedColumnList(props.baseTableName, props.joins);

	function getOrderByValue() {
		if (!props.orderBy) return { value: 'not ordered', label: 'not ordered' };
		const orderBy = props.orderBy;
		return {
			value: `${orderBy.tableName}.${orderBy.columnName}`,
			label: `${orderBy.tableName}.${orderBy.columnName}`
		};
	}

	function getOrderByOptions() {
		let options: { value: string; label: string }[] = [{ value: 'not ordered', label: 'not ordered' }];
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
		<Box className={'rsOrderByInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Order By
			</Label>
			<Box className={'selectContainer'}>
				<Select
					value={getOrderByValue()}
					options={getOrderByOptions()}
					onChange={(newValue) => {
						if (!newValue) return;

						if (newValue.value === 'not ordered') {
							props.onUpdate(undefined);
							return;
						}

						props.onUpdate({
							tableName: newValue.value.split('.')[0],
							columnName: newValue.value.split('.')[1],
							order: props.orderBy?.order || 'ASC'
						});
					}}
				/>
				{!!props.orderBy && (
					<Select
						value={{ label: props.orderBy?.order, value: props.orderBy?.order }}
						options={[
							{ value: 'ASC', label: 'ASC' },
							{ value: 'DESC', label: 'DESC' }
						]}
						onChange={(newValue) => {
							if (!newValue) return;
							if (!props.orderBy) return;
							props.onUpdate({
								...props.orderBy,
								order: newValue.value
							});
						}}
					/>
				)}
			</Box>
		</Box>
	);
};

export default OrderByInput;
