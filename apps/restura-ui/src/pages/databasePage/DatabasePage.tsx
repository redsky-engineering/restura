import * as React from 'react';
import './DatabasePage.scss';
import { Page } from '@redskytech/framework/996';
import PageHeader from '../../components/pageHeader/PageHeader';
import { Box, Button, Icon, InputText, Label } from '@redskytech/framework/ui';
import DbTable from '../../components/dbTable/DbTable';
import { useRecoilState } from 'recoil';
import globalState from '../../state/globalState';
import cloneDeep from 'lodash.clonedeep';
import { useEffect, useState } from 'react';
import SchemaService from '../../services/schema/SchemaService.js';
import themes from '../../themes/themes.scss?export';

interface DatabasePageProps {}

const DatabasePage: React.FC<DatabasePageProps> = (props) => {
	const [schema, setSchema] = useRecoilState(globalState.schema);
	const [isColumnsFiltered, setIsColumnsFiltered] = useState<boolean>(false);
	const [isIndexesFiltered, setIsIndexesFiltered] = useState<boolean>(false);
	const [isForeignKeysFiltered, setIsForeignKeysFiltered] = useState<boolean>(false);
	const [isChecksFiltered, setIsChecksFiltered] = useState<boolean>(false);
	const [tableSearch, setTableSearch] = useState<string>('');
	const [validationError, setValidationError] = useState<string>('');

	const isAnyFiltersApplied = isColumnsFiltered || isIndexesFiltered || isForeignKeysFiltered;

	function addNewTable() {
		if (!schema) return;
		let updatedSchema = cloneDeep(schema);
		updatedSchema.database.unshift({
			name: `new_table_${Math.random().toString(36).substr(2, 5)}`,
			columns: [
				{ name: 'id', hasAutoIncrement: true, isNullable: false, roles: [], type: 'BIGINT' },
				{ name: 'createdOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' },
				{ name: 'modifiedOn', isNullable: false, default: 'now()', roles: [], type: 'DATETIME' }
			],
			foreignKeys: [],
			checkConstraints: [],
			indexes: [
				{
					name: 'PRIMARY',
					columns: ['id'],
					isUnique: true,
					isPrimaryKey: true,
					order: 'ASC'
				}
			],
			roles: []
		});
		setSchema(updatedSchema);
	}

	useEffect(() => {
		if (!schema) return;
		let errors = SchemaService.validateDatabaseSchema(schema);
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
						if (tableSearch === '') return true;
						return item.name.toLowerCase().includes(tableSearch.toLowerCase());
					})
					.map((item) => {
						return (
							<DbTable
								hideColumns={isAnyFiltersApplied && !isColumnsFiltered}
								hideIndexes={isAnyFiltersApplied && !isIndexesFiltered}
								hideForeignKeys={isAnyFiltersApplied && !isForeignKeysFiltered}
								hideChecks={isAnyFiltersApplied && !isChecksFiltered}
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
