import * as React from 'react';
import './DbTableCell.scss';
import { Box, Icon, InputText, Label, Select } from '@redskytech/framework/ui';
import { useEffect, useState } from 'react';
import classNames from 'classnames';
import themes from '../../themes/themes.scss?export';

export type ColumnCellType = 'text' | 'selectBoolean' | 'select' | 'multiSelect';

interface DbTableCellProps {
	cellType: ColumnCellType;
	value: string | boolean | number | string[];
	onChange?: (value: string) => void;
	onMultiSelectChange?: (value: string[]) => void;
	selectOptions?: string[];
	disableEdit?: boolean;
	isPrimaryKey?: boolean;
	isMultiSelectCreatable?: boolean;
	emptyValue?: string;
	addId?: boolean;
}

const DbTableCell: React.FC<DbTableCellProps> = (props) => {
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [multiSelectValue, setMultiSelectValue] = useState<{ value: string; label: string }[]>([]);

	function onBlur(event: React.FocusEvent<HTMLInputElement>) {
		if (props.onChange) props.onChange(event.target.value);
		setIsEditing(false);
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Enter') {
			if (props.onChange) props.onChange(event.currentTarget.value);
			setIsEditing(false);
		} else if (event.key === 'Tab') {
			event.stopPropagation();
			event.preventDefault();
			if (props.onChange) props.onChange(event.currentTarget.value);
			setIsEditing(false);
		}
	}

	function onSelectChanged(selection: { value: string; label: string } | null) {
		if (selection && props.onChange) props.onChange(selection.value);
		setIsEditing(false);
	}

	function onMultiSelectChanged(selection: readonly { value: string; label: string }[] | null) {
		if (selection) setMultiSelectValue([...selection]);
	}

	function onMultiSelectMenuClosed() {
		if (props.onMultiSelectChange) props.onMultiSelectChange(multiSelectValue.map((s) => s.value));
		setIsEditing(false);
	}

	function renderInput(): React.ReactNode {
		switch (props.cellType) {
			case 'text':
				return (
					<InputText
						defaultValue={props.value.toString()}
						inputMode={'text'}
						onBlur={onBlur}
						autoFocus
						onKeyDown={onKeyDown}
					/>
				);
			case 'selectBoolean':
				let label = props.value ? 'YES' : 'NO';
				return (
					<Select<{ label: string; value: string }>
						defaultValue={{ label, value: props.value.toString() }}
						defaultMenuIsOpen
						onChange={onSelectChanged}
						autoFocus
						options={[
							{ label: 'YES', value: 'true' },
							{ label: 'NO', value: 'false' }
						]}
						onBlur={() => setIsEditing(false)}
					/>
				);
			case 'select':
				return (
					<Select<{ label: string; value: string }>
						defaultValue={{ label: props.value.toString(), value: props.value.toString() }}
						defaultMenuIsOpen
						onChange={onSelectChanged}
						autoFocus
						options={props.selectOptions!.map((item) => {
							return { label: item, value: item };
						})}
						onBlur={() => setIsEditing(false)}
					/>
				);
			case 'multiSelect':
				return (
					<Select<{ label: string; value: string }, true>
						isMulti
						defaultValue={(props.value as string[]).map((item) => {
							return { label: item, value: item };
						})}
						closeMenuOnSelect={false}
						defaultMenuIsOpen
						onChange={onMultiSelectChanged}
						onMenuClose={onMultiSelectMenuClosed}
						autoFocus
						isCreatable={props.isMultiSelectCreatable}
						options={[...props.selectOptions!]
							.sort((a, b) => a.localeCompare(b))
							.map((item) => {
								return { label: item, value: item };
							})}
						onBlur={() => setIsEditing(false)}
					/>
				);
		}
		return <></>;
	}

	function renderValue(): React.ReactNode {
		if (typeof props.value === 'boolean')
			return props.value ? <span style={{ color: themes.secondaryOrange500 }}>Yes</span> : 'No';
		if (Array.isArray(props.value)) {
			if (props.value.length === 0) return props.emptyValue || '-';
			let mutatableValue = [...props.value];
			return mutatableValue
				.sort((a, b) => {
					return a.localeCompare(b);
				})
				.join(', ');
		}
		if (!props.value) return props.emptyValue || '-';
		return props.value;
	}

	return (
		<Box
			id={props.addId ? `Cell-${props.value}` : undefined}
			className={classNames('rsDbTableCell', { disableEdit: props.disableEdit })}
			onClick={() => {
				if (isEditing) return;
				if (!props.disableEdit) setIsEditing(true);
			}}
		>
			{isEditing ? (
				renderInput()
			) : (
				<Box position={'relative'}>
					{!!props.isPrimaryKey && (
						<Icon
							className={'primaryKeyIndicator'}
							iconImg={'icon-star'}
							fontSize={10}
							color={themes.neutralBeige300}
							mr={4}
						/>
					)}
					<Label variant={'caption1'} weight={'regular'} className={'editableTextCell'}>
						{renderValue()}
					</Label>
				</Box>
			)}
		</Box>
	);
};

export default DbTableCell;
