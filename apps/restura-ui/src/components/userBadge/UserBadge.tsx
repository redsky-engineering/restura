import * as React from 'react';
import './UserBadge.scss';

import { Label, Avatar, Button, Icon } from '@redskytech/framework/ui';

interface UserBadgeProps {
	userName: string;
	imageUrl?: string;
}

const UserBadge: React.FC<UserBadgeProps> = (props) => {
	return (
		<div className={'rsUserBadge'}>
			<Avatar widthHeight={40} image={props.imageUrl} name={props.userName} />
			<Label variant={'subheader2'} weight={'regular'}>
				{props.userName}
			</Label>
		</div>
	);
};

export default UserBadge;
