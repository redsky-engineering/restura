import * as React from 'react';
import './JoinSelectorPopup.scss';
import { Box, Icon, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { useMemo } from 'react';

export interface JoinSelectorPopupProps extends PopupProps {
	baseTable: string;
	onSelect: (type: 'CUSTOM' | 'STANDARD', localColumn: string, foreignTable: string, foreignColumn: string) => void;
}

const JoinSelectorPopup: React.FC<JoinSelectorPopupProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const tableForeignKeys = useMemo<Restura.ForeignKeyData[]>(() => {
		if (!schema) return [];
		let table = schema.database.find((item) => item.name === props.baseTable);
		if (!table) return [];
		return table.foreignKeys;
	}, [schema]);

	function onAccept(type: 'CUSTOM' | 'STANDARD', localColumn: string, foreignTable: string, foreignColumn: string) {
		props.onSelect(type, localColumn, foreignTable, foreignColumn);
		popupController.close(JoinSelectorPopup);
	}

	function onReject() {
		popupController.close(JoinSelectorPopup);
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
				{tableForeignKeys.map((foreignKey) => {
					return (
						<Box key={foreignKey.name} display={'contents'} className={'tableRow'}>
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
								{foreignKey.column}
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
											'STANDARD',
											foreignKey.column,
											foreignKey.refTable,
											foreignKey.refColumn
										);
									}}
								/>
								<Icon
									iconImg={'icon-edit'}
									fontSize={16}
									cursorPointer
									onClick={() => {
										onAccept(
											'CUSTOM',
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
			<Box className={'rsJoinSelectorPopup'}>
				<Box className={'header'}>
					<Label variant={'h4'} color={themes.neutralWhite} weight={'medium'}>
						Join Onto {props.baseTable} Table
					</Label>
					<Icon iconImg={'icon-close'} onClick={onReject} cursorPointer p={4} fontSize={16} />
				</Box>
				<Box p={'16px 24px 24px 24px'}>{renderForeignKeys()}</Box>
			</Box>
		</Popup>
	);
};

export default JoinSelectorPopup;
