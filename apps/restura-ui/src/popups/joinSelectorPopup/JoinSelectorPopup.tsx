import { Box, Icon, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import * as React from 'react';
import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import themes from '../../themes/themes.scss?export';
import './JoinSelectorPopup.scss';

export interface JoinSelectorPopupProps extends PopupProps {
	baseTable: string;
	onSelect: (
		type: 'CUSTOM' | 'STANDARD',
		localTable: string | undefined,
		localTableAlias: string | undefined,
		localColumn: string,
		foreignTable: string,
		foreignColumn: string
	) => void;
	joins: Restura.JoinData[];
}

const JoinSelectorPopup: React.FC<JoinSelectorPopupProps> = (props) => {
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	const tableForeignKeys = useMemo<
		(Restura.ForeignKeyData & { localTable?: string; localTableAlias?: string })[]
	>(() => {
		if (!schema) return [];

		// Get foreign keys from base table
		let baseTable = schema.database.find((item) => item.name === props.baseTable);
		if (!baseTable) return [];
		let foreignKeys = [...baseTable.foreignKeys];

		// Get foreign keys from any existing joins
		if (props.joins) {
			props.joins.forEach((join) => {
				const joinedTable = schema.database.find((item) => item.name === join.table);
				if (joinedTable) {
					foreignKeys = [
						...foreignKeys,
						...joinedTable.foreignKeys.map((foreignKey) => ({
							...foreignKey,
							localTable: joinedTable.name,
							localTableAlias: join.alias
						}))
					];
				}
			});
		}

		return foreignKeys;
	}, [schema, props.baseTable, props.joins]);

	function handleAccept(
		type: 'CUSTOM' | 'STANDARD',
		localTable: string | undefined,
		localTableAlias: string | undefined,
		localColumn: string,
		foreignTable: string,
		foreignColumn: string
	) {
		props.onSelect(type, localTable, localTableAlias, localColumn, foreignTable, foreignColumn);
		popupController.close(JoinSelectorPopup);
	}

	function handleReject() {
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
					Local Table
				</Label>
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
								{foreignKey.localTable || props.baseTable}
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
										handleAccept(
											'STANDARD',
											foreignKey.localTable,
											foreignKey.localTableAlias,
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
										handleAccept(
											'CUSTOM',
											foreignKey.localTable,
											foreignKey.localTableAlias,
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
					<Icon iconImg={'icon-close'} onClick={handleReject} cursorPointer p={4} fontSize={16} />
				</Box>
				<Box p={'16px 24px 24px 24px'}>{renderForeignKeys()}</Box>
			</Box>
		</Popup>
	);
};

export default JoinSelectorPopup;
