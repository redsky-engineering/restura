import * as React from 'react';
import { Box, Label, Select } from '@redskytech/framework/ui';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { useMemo } from 'react';

interface BaseTableInputProps {
	tableName: string;
	onChange: (newTableName: string) => void;
}

const BaseTableInput: React.FC<BaseTableInputProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const tableList = useMemo<string[]>(() => {
		if (!schema) return [];
		return schema.database.map((table) => {
			return table.name;
		});
	}, [schema]);

	return (
		<Box className={'rsBaseTableInput'}>
			<Label variant={'body1'} weight={'regular'} mb={4}>
				Base Table
			</Label>
			<Select
				value={{ value: props.tableName, label: props.tableName }}
				options={tableList.map((table) => {
					return { value: table, label: table };
				})}
				onChange={(newValue) => {
					if (!newValue) return;
					props.onChange(newValue.value);
				}}
			/>
		</Box>
	);
};

export default BaseTableInput;
