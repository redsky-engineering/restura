import React from 'react';
import { Page } from '@redskytech/framework/996';
import { Label } from '@redskytech/framework/ui';

function NotFoundPage(): JSX.Element {
	return (
		<Page className="rsNotFoundPage">
			<Label variant={'h5'} weight={'medium'}>
				Page Not Found...
			</Label>
		</Page>
	);
}

export default NotFoundPage;
