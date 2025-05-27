import { Page } from '@redskytech/framework/996';
import { Box, Label } from '@redskytech/framework/ui';
import classNames from 'classnames';
import * as React from 'react';
import { useState } from 'react';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState.js';
import CustomTypeSection from './customTypeSection/CustomTypeSection';
import './GlobalPage.scss';
import GlobalParamSection from './globalParamSection/GlobalParamSection';
import RoleSection from './roleSection/RoleSection';
import ScopeSection from './scopeSection/ScopeSection.js';

interface GlobalPageProps {}

const GlobalPage: React.FC<GlobalPageProps> = (_props) => {
	const [displayedSection, setDisplayedSection] = useState<'CUSTOM_TYPES' | 'GLOBAL_PARAMS' | 'ROLES' | 'SCOPES'>(
		'CUSTOM_TYPES'
	);
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);

	function renderTabHeader() {
		return (
			<Box className={'tabHeader'}>
				<Box
					className={classNames('tab', { isSelected: displayedSection === 'CUSTOM_TYPES' })}
					onClick={() => setDisplayedSection('CUSTOM_TYPES')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Custom Types ({schema?.customTypes.length || 0})
					</Label>
				</Box>
				<Box
					className={classNames('tab', { isSelected: displayedSection === 'GLOBAL_PARAMS' })}
					onClick={() => setDisplayedSection('GLOBAL_PARAMS')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Global Params
					</Label>
				</Box>
				<Box
					className={classNames('tab', { isSelected: displayedSection === 'ROLES' })}
					onClick={() => setDisplayedSection('ROLES')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Roles
					</Label>
				</Box>
				<Box
					className={classNames('tab', { isSelected: displayedSection === 'SCOPES' })}
					onClick={() => setDisplayedSection('SCOPES')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Scopes
					</Label>
				</Box>
			</Box>
		);
	}
	return (
		<Page className={'rsGlobalPage'}>
			{renderTabHeader()}
			<Box className={'content'}>
				{displayedSection === 'CUSTOM_TYPES' && <CustomTypeSection />}
				{displayedSection === 'GLOBAL_PARAMS' && <GlobalParamSection />}
				{displayedSection === 'ROLES' && <RoleSection />}
				{displayedSection === 'SCOPES' && <ScopeSection />}
			</Box>
		</Page>
	);
};

export default GlobalPage;
