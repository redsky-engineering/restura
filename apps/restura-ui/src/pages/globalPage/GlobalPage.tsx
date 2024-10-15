import * as React from 'react';
import './GlobalPage.scss';
import { Page } from '@redskytech/framework/996';
import { useState } from 'react';
import { Box, Label } from '@redskytech/framework/ui';
import classNames from 'classnames';
import GlobalParamSection from './globalParamSection/GlobalParamSection';
import RoleSection from './roleSection/RoleSection';
import CustomTypeSection from './customTypeSection/CustomTypeSection';

interface GlobalPageProps {}

const GlobalPage: React.FC<GlobalPageProps> = (props) => {
	const [displayedSection, setDisplayedSection] = useState<'CUSTOM_TYPES' | 'GLOBAL_PARAMS' | 'ROLES'>(
		'CUSTOM_TYPES'
	);

	function renderTabHeader() {
		return (
			<Box className={'tabHeader'}>
				<Box
					className={classNames('tab', { isSelected: displayedSection === 'CUSTOM_TYPES' })}
					onClick={() => setDisplayedSection('CUSTOM_TYPES')}
				>
					<Label variant={'subheader2'} weight={'semiBold'}>
						Custom Types
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
			</Box>
		</Page>
	);
};

export default GlobalPage;
