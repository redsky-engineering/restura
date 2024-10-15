import * as React from 'react';
import './NestedObjectSelectorPopup.scss';
import { Box, Icon, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { useMemo } from 'react';

export interface NestedObjectSelectorPopupProps extends PopupProps {
	baseTable: string;
	onSelect: (localTable: string, localColumn: string, foreignTable: string, foreignColumn: string) => void;
}

const NestedObjectSelectorPopup: React.FC<NestedObjectSelectorPopupProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const tableForeignKeys = useMemo<{ table: string; column: string; refTable: string; refColumn: string }[]>(() => {
		if (!schema) return [];
		let table = schema.database.find((item) => item.name === props.baseTable);
		if (!table) return [];
		let foreignKeys = table.foreignKeys.map((fk) => {
			return {
				table: props.baseTable,
				column: fk.column,
				refTable: fk.refTable,
				refColumn: fk.refColumn
			};
		});
		foreignKeys = foreignKeys.concat(
			schema.database
				.filter((item) => {
					if (item.name === props.baseTable) return false;
					return item.foreignKeys.find((fk) => fk.refTable === props.baseTable) !== undefined;
				})
				.map((item) =>
					item.foreignKeys
						.filter((fk) => {
							return fk.refTable === props.baseTable;
						})
						.map((fk) => {
							return {
								table: props.baseTable,
								column: fk.refColumn,
								refTable: item.name,
								refColumn: fk.column
							};
						})
				)
				.flat()
		);
		console.log(foreignKeys);
		return foreignKeys;
	}, [schema]);

	function onAccept(localTable: string, localColumn: string, foreignTable: string, foreignColumn: string) {
		props.onSelect(localTable, localColumn, foreignTable, foreignColumn);
		popupController.close(NestedObjectSelectorPopup);
	}

	function onReject() {
		popupController.close(NestedObjectSelectorPopup);
	}

	function renderForeignKeys() {
		if (tableForeignKeys.length === 0)
			return (
				<Label variant={'h6'} weight={'regular'}>
					No Foreign Keys Found
				</Label>
			);

		return (
			<Box className={'keyGrid'}>
				<Label variant={'caption1'} className={'tableHeader'} weight={'semiBold'}>
					Column
				</Label>
				<Label variant={'caption1'} className={'tableHeader'} weight={'semiBold'}>
					Ref Table
				</Label>
				<Label variant={'caption1'} className={'tableHeader'} weight={'semiBold'}>
					Ref Column
				</Label>
				<Box className={'tableHeader'} />
				{tableForeignKeys.map((foreignKey, index) => {
					return (
						<Box key={index} display={'contents'} className={'tableRow'}>
							<Label
								className={'tableItem'}
								variant={'caption1'}
								color={themes.neutralWhite}
								weight={'regular'}
							>
								{foreignKey.column}
							</Label>
							<Label
								className={'tableItem'}
								variant={'caption1'}
								color={themes.neutralWhite}
								weight={'regular'}
							>
								{foreignKey.refTable}
							</Label>
							<Label
								className={'tableItem'}
								variant={'caption1'}
								color={themes.neutralWhite}
								weight={'regular'}
							>
								{foreignKey.refColumn}
							</Label>
							<Box display={'flex'} gap={8}>
								<Icon
									iconImg={'icon-plus'}
									fontSize={16}
									cursorPointer
									onClick={() => {
										onAccept(
											foreignKey.table,
											foreignKey.column,
											foreignKey.refTable,
											foreignKey.refColumn
										);
									}}
								/>
							</Box>
						</Box>
					);
				})}
			</Box>
		);
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsNestedObjectSelector'}>
				<Box className={'header'}>
					<Label variant={'h4'} color={themes.neutralWhite} weight={'medium'}>
						Select Foreign Relationship
					</Label>
					<Icon iconImg={'icon-close'} onClick={onReject} cursorPointer p={4} fontSize={16} />
				</Box>
				<Box p={'16px 24px 24px 24px'}>{renderForeignKeys()}</Box>
			</Box>
		</Popup>
	);
};

export default NestedObjectSelectorPopup;
