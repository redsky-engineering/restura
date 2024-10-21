import * as React from 'react';
import './ConfirmationPopup.scss';
import { Box, Button, Icon, Label, Popup, popupController, PopupProps } from '@redskytech/framework/ui';
import themes from '../../themes/themes.scss?export';

export interface ConfirmationPopupProps extends PopupProps {
	headerLabel: string;
	label: string;
	reverseOrder?: boolean;
	acceptLabel: string;
	rejectLabel?: string;
	onAccept: () => void;
	onReject?: () => void;
}

const ConfirmationPopup: React.FC<ConfirmationPopupProps> = (props) => {
	function onAccept() {
		popupController.close(ConfirmationPopup);
		props.onAccept();
	}

	function onReject() {
		popupController.close(ConfirmationPopup);
		if (props.onReject) props.onReject();
	}

	function renderButtons() {
		if (props.reverseOrder) {
			return (
				<>
					<Button look={'outlinedPrimary'} onClick={onAccept}>
						{props.acceptLabel}
					</Button>
					{!!props.rejectLabel && (
						<Button look={'containedPrimary'} onClick={onReject}>
							{props.rejectLabel}
						</Button>
					)}
				</>
			);
		}
		return (
			<>
				{!!props.rejectLabel && (
					<Button look={'outlinedPrimary'} onClick={onReject}>
						{props.rejectLabel}
					</Button>
				)}
				<Button look={'containedPrimary'} onClick={onAccept}>
					{props.acceptLabel}
				</Button>
			</>
		);
	}

	return (
		<Popup {...props} preventCloseByBackgroundClick>
			<Box className={'rsConfirmationPopup'}>
				<Box className={'header'}>
					<Label variant={'h4'} weight={'semiBold'}>
						{props.headerLabel}
					</Label>
					<Icon iconImg={'icon-close'} fontSize={24} onClick={onReject} />
				</Box>
				<Box p={'16px 24px 24px 24px'}>
					<Label variant={'body1'} mb={24} weight={'regular'}>
						{props.label}
					</Label>
					<Box display={'flex'} alignItems={'center'} justifyContent={'space-around'} gap={24}>
						{renderButtons()}
					</Box>
				</Box>
			</Box>
		</Popup>
	);
};

export default ConfirmationPopup;
