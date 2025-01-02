import { Page } from '@redskytech/framework/996';
import { Box, Button, InputText, Label } from '@redskytech/framework/ui';
import cloneDeep from 'lodash.clonedeep';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import DbTable from '../../components/dbTable/DbTable';
import PageHeader from '../../components/pageHeader/PageHeader';
import SchemaService from '../../services/schema/SchemaService.js';
import globalState from '../../state/globalState';
import themes from '../../themes/themes.scss?export';
import './DatabasePage.scss';

interface DatabasePageProps {}

const DatabasePage: React.FC<DatabasePageProps> = () => {
	const [schema, setSchema] = useRecoilState(globalState.schema);
	const [isColumnsFiltered, setIsColumnsFiltered] = useState<boolean>(false);
	const [isIndexesFiltered, setIsIndexesFiltered] = useState<boolean>(false);
	const [isForeignKeysFiltered, setIsForeignKeysFiltered] = useState<boolean>(false);
	const [isChecksFiltered, setIsChecksFiltered] = useState<boolean>(false);
	const [isNotificationsFiltered, setIsNotificationsFiltered] = useState<boolean>(false);
	const [tableSearch, setTableSearch] = useState<string>('');
	const [validationError, setValidationError] = useState<string>('');

	const isAnyFiltersApplied =
		isColumnsFiltered || isIndexesFiltered || isForeignKeysFiltered || isChecksFiltered || isNotificationsFiltered;

	function addNewTable() {
		if (!schema) return;
		const updatedSchema = cloneDeep(schema);
		updatedSchema.database.unshift({
			name: `new_table_${Math.random().toString(36).substr(2, 5)}`,
			columns: [
				{
					name: 'id',
					hasAutoIncrement: true,
					isNullable: false,
					roles: [],
					type: 'BIGSERIAL',
					isPrimary: true
				},
				{ name: 'createdOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' }
			],
			foreignKeys: [],
			checkConstraints: [],
			indexes: [],
			roles: []
		});
		setSchema(updatedSchema);
	}

	useEffect(() => {
		if (!schema) return;
		const errors = SchemaService.validateDatabaseSchema(schema);
		if (!errors.length) return;
		setValidationError(errors.join(','));
	}, [schema]);

	function renderFiltersAndSearch() {
		return (
			<Box display={'flex'} justifyContent={'space-between'} mb={32} alignItems={'center'}>
				<Box display={'flex'} alignItems={'center'}>
					<Label variant={'subheader2'} weight={'medium'}>
						Filter:
					</Label>
					<Button
						look={isColumnsFiltered ? 'containedPrimary' : 'outlinedPrimary'}
						ml={24}
						onClick={() => setIsColumnsFiltered(!isColumnsFiltered)}
					>
						Columns
					</Button>
					<Button
						look={isIndexesFiltered ? 'containedPrimary' : 'outlinedPrimary'}
						ml={8}
						onClick={() => setIsIndexesFiltered(!isIndexesFiltered)}
					>
						Indexes
					</Button>
					<Button
						look={isForeignKeysFiltered ? 'containedPrimary' : 'outlinedPrimary'}
						ml={8}
						onClick={() => setIsForeignKeysFiltered(!isForeignKeysFiltered)}
					>
						Foreign Keys
					</Button>
					<Button
						look={isChecksFiltered ? 'containedPrimary' : 'outlinedPrimary'}
						ml={8}
						onClick={() => setIsChecksFiltered(!isChecksFiltered)}
					>
						Checks
					</Button>
					<Button
						look={isNotificationsFiltered ? 'containedPrimary' : 'outlinedPrimary'}
						ml={8}
						onClick={() => setIsNotificationsFiltered(!isNotificationsFiltered)}
					>
						Notifications
					</Button>
				</Box>
				{validationError && (
					<Label variant={'subheader2'} weight={'bold'} color={themes.primaryRed500}>
						{validationError}
					</Label>
				)}
				<Box display={'flex'} alignItems={'center'}>
					<Label variant={'subheader2'} weight={'medium'} mr={8}>
						Search
					</Label>
					<InputText inputMode={'search'} value={tableSearch} onChange={(value) => setTableSearch(value)} />
				</Box>
			</Box>
		);
	}

	if (!schema) return <></>;
	return (
		<Page className={'rsDatabasePage'}>
			<PageHeader
				title={'Database'}
				rightNode={
					<Button look={'containedPrimary'} onClick={addNewTable} small>
						Add Table
					</Button>
				}
			/>
			<Box className={'pageContent'}>
				{renderFiltersAndSearch()}
				{schema.database
					.filter((item) => {
						const lowerCaseSearch = tableSearch.toLowerCase().trim();
						if (lowerCaseSearch === '') return true;
						const lowerCaseItem = item.name.toLowerCase().trim();

						// If the search is wrapped in quotes, then we are searching for an exact match
						if (lowerCaseSearch.startsWith('"') && lowerCaseSearch.endsWith('"'))
							return lowerCaseItem === lowerCaseSearch.substring(1, lowerCaseSearch.length - 1);

						return lowerCaseItem.includes(lowerCaseSearch);
					})
					.map((item) => {
						return (
							<DbTable
								hideColumns={isAnyFiltersApplied && !isColumnsFiltered}
								hideIndexes={isAnyFiltersApplied && !isIndexesFiltered}
								hideForeignKeys={isAnyFiltersApplied && !isForeignKeysFiltered}
								hideChecks={isAnyFiltersApplied && !isChecksFiltered}
								hideNotifications={isAnyFiltersApplied && !isNotificationsFiltered}
								key={item.name}
								tableName={item.name}
							/>
						);
					})}
			</Box>
		</Page>
	);
};

export default DatabasePage;
