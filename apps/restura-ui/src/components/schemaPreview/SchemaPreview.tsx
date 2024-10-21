import React, { useEffect, useState } from 'react';
import './SchemaPreview.scss';
import themes from '../../themes/themes.scss?export';
import { Box, Button, Icon, Label, rsToastify } from '@redskytech/framework/ui';
import serviceFactory from '../../services/serviceFactory';
import SchemaService from '../../services/schema/SchemaService';
import { useRecoilValue } from 'recoil';
import globalState from '../../state/globalState';
import { ObjectUtils, StringUtils, WebUtils } from '../../utils/utils';
import classNames from 'classnames';
import PageHeader from '../pageHeader/PageHeader';
import { useOnClickOutsideRef } from '@redskytech/framework/hooks';

interface SchemaPreviewProps {
	onClose: () => void;
	open: boolean;
}

const SchemaPreview: React.FC<SchemaPreviewProps> = (props) => {
	const schemaService = serviceFactory.get<SchemaService>('SchemaService');
	const schema = useRecoilValue<Restura.Schema | undefined>(globalState.schema);
	const [schemaDiffs, setSchemaDiffs] = useState<Restura.SchemaPreview | undefined>();
	const [expand, setExpand] = useState<boolean>(false);
	const [isDownloadingPreview, setIsDownloadingPreview] = useState<boolean>(false);

	const previewRef = useOnClickOutsideRef(() => {
		if (props.open) {
			setExpand(false);
			props.onClose();
		}
	});

	useEffect(() => {
		if (!expand || isDownloadingPreview) return;
		Prism.highlightAll();
	}, [schemaDiffs?.commands, expand, isDownloadingPreview]);

	useEffect(() => {
		if (!schema || !props.open) return;
		(async function getSchemaPreview() {
			try {
				setIsDownloadingPreview(true);
				const res = await schemaService.getSchemaPreview(schema);
				setSchemaDiffs(res);
				setIsDownloadingPreview(false);
			} catch (e) {
				setIsDownloadingPreview(false);
				rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to submit schema.'), 'Submit Error');
			}
		})();
	}, [props.open]);

	async function submitSchema() {
		if (!schema) return;
		try {
			await schemaService.updateSchema(schema);
			props.onClose();
			rsToastify.success('Schema uploaded successfully', 'Success');
		} catch (e) {
			rsToastify.error(WebUtils.getRsErrorMessage(e, 'Failed to submit schema.'), 'Submit Error');
		}
	}

	function chooseLabelColor(item: Restura.SchemaChangeValue): string {
		let color = themes.success;
		if (item.changeType === 'MODIFIED') color = themes.secondaryOrange500;
		else if (item.changeType === 'DELETED') color = themes.primaryRed500;
		return color;
	}

	function renderShrunk() {
		if (!schemaDiffs) return null;

		const newEndpointsCount = schemaDiffs.endPoints.filter((c) => c.changeType === 'NEW').length;
		const modifiedEndpointsCount = schemaDiffs.endPoints.filter((c) => c.changeType === 'MODIFIED').length;
		const deletedEndpointsCount = schemaDiffs.endPoints.filter((c) => c.changeType === 'DELETED').length;

		const newGlobalsCount = schemaDiffs.globalParams.filter((c) => c.changeType === 'NEW').length;
		const modifiedGlobalsCount = schemaDiffs.globalParams.filter((c) => c.changeType === 'MODIFIED').length;
		const deletedGlobalsCount = schemaDiffs.globalParams.filter((c) => c.changeType === 'DELETED').length;

		const newRolesCount = schemaDiffs.roles.filter((c) => c.changeType === 'NEW').length;
		const modifiedRolesCount = schemaDiffs.roles.filter((c) => c.changeType === 'MODIFIED').length;
		const deletedRolesCount = schemaDiffs.roles.filter((c) => c.changeType === 'DELETED').length;

		return (
			<>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						SQL Statements
					</Label>
					{!schemaDiffs.commands.length ? (
						<Label color={themes.success} variant={'body1'} weight={'regular'}>
							No Change
						</Label>
					) : (
						<Label color={themes.secondaryOrange500} variant={'body1'} weight={'regular'}>
							Modified
						</Label>
					)}
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Endpoints
					</Label>
					{!newEndpointsCount && !modifiedEndpointsCount && !deletedEndpointsCount && (
						<Label color={themes.success} variant={'body1'} weight={'regular'}>
							No Change
						</Label>
					)}
					{!!newEndpointsCount && (
						<Label color={themes.primaryRed300} variant={'body1'} weight={'regular'}>
							{newEndpointsCount} Added
						</Label>
					)}
					{!!modifiedEndpointsCount && (
						<Label color={themes.secondaryOrange500} variant={'body1'} weight={'regular'}>
							{modifiedEndpointsCount} Modified
						</Label>
					)}
					{!!deletedEndpointsCount && (
						<Label color={themes.primaryRed500} variant={'body1'} weight={'regular'}>
							{deletedEndpointsCount} Deleted
						</Label>
					)}
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Global Parameters
					</Label>
					{!newGlobalsCount && !modifiedGlobalsCount && !deletedGlobalsCount && (
						<Label color={themes.success} variant={'body1'} weight={'regular'}>
							No Change
						</Label>
					)}
					{!!newGlobalsCount && (
						<Label color={themes.success} variant={'body1'} weight={'regular'}>
							{newGlobalsCount} Added
						</Label>
					)}
					{!!modifiedGlobalsCount && (
						<Label color={themes.secondaryOrange500} variant={'body1'} weight={'regular'}>
							{modifiedGlobalsCount} Modified
						</Label>
					)}
					{!!deletedGlobalsCount && (
						<Label color={themes.primaryRed500} variant={'body1'} weight={'regular'}>
							{deletedGlobalsCount} Deleted
						</Label>
					)}
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Roles
					</Label>
					{!newRolesCount && !modifiedRolesCount && !deletedRolesCount && (
						<Label color={themes.success} variant={'body1'} weight={'regular'}>
							No Change
						</Label>
					)}
					{!!newRolesCount && (
						<Label color={themes.success} variant={'body1'} weight={'regular'}>
							{newRolesCount} Added
						</Label>
					)}
					{!!modifiedRolesCount && (
						<Label color={themes.secondaryOrange500} variant={'body1'} weight={'regular'}>
							{modifiedRolesCount} Modified
						</Label>
					)}
					{!!deletedRolesCount && (
						<Label color={themes.primaryRed500} variant={'body1'} weight={'regular'}>
							{deletedRolesCount} Deleted
						</Label>
					)}
				</Box>
				<Box className={'sectionBox'} padding={24}>
					<Label variant={'h6'} weight={'medium'} mb={8}>
						Custom Types
					</Label>
					<Label
						color={schemaDiffs?.customTypes ? themes.secondaryOrange500 : themes.success}
						variant={'body1'}
						weight={'regular'}
					>
						{schemaDiffs?.customTypes ? 'Changed' : 'No Change'}
					</Label>
				</Box>
			</>
		);
	}

	function renderExpanded() {
		return (
			<>
				<Box className={'sectionBox'} padding={24}>
					<Box display={'flex'} gap={8} alignItems={'flex-end'} justifyContent={'space-between'} mb={8}>
						<Label variant={'h6'} weight={'medium'}>
							SQL Statements
						</Label>
						<Button
							look={'outlinedPrimary'}
							onClick={() => {
								StringUtils.copyToClipboard(schemaDiffs?.commands || '');
								rsToastify.success('SQL statements copied to clipboard', 'Copied SQL');
							}}
							small
						>
							Copy SQL to Clipboard
						</Button>
					</Box>
					<pre>
						<code className={'sqlStatements language-sql'}>{schemaDiffs?.commands}</code>
					</pre>
				</Box>
				{ObjectUtils.isArrayWithData(schemaDiffs?.endPoints) && (
					<Box className={'sectionBox'} padding={24}>
						<Label color={themes.success} variant={'h6'} weight={'medium'} mb={8}>
							Endpoints
						</Label>
						<Box>
							{schemaDiffs?.endPoints.map((endpoint) => {
								return (
									<Box key={endpoint.name} display={'flex'} alignItems={'center'} gap={24}>
										<Label variant={'body1'} weight={'regular'}>
											{endpoint.name}
										</Label>
										<Label
											color={chooseLabelColor(endpoint)}
											variant={'caption1'}
											weight={'regular'}
										>
											{endpoint.changeType}
										</Label>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}
				{ObjectUtils.isArrayWithData(schemaDiffs?.globalParams) && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Global Parameters
						</Label>
						<Box>
							{schemaDiffs?.globalParams.map((param) => {
								return (
									<Box key={param.name} display={'flex'} alignItems={'center'} gap={24}>
										<Label variant={'body1'} weight={'regular'}>
											{param.name}
										</Label>
										<Label color={chooseLabelColor(param)} variant={'caption1'} weight={'regular'}>
											{param.changeType}
										</Label>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}
				{ObjectUtils.isArrayWithData(schemaDiffs?.roles) && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Roles
						</Label>
						<Box>
							{schemaDiffs?.roles.map((role) => {
								return (
									<Box key={role.name} display={'flex'} alignItems={'center'} gap={24}>
										<Label variant={'body1'} weight={'regular'}>
											{role.name}
										</Label>
										<Label color={chooseLabelColor(role)} variant={'caption1'} weight={'regular'}>
											{role.changeType}
										</Label>
									</Box>
								);
							})}
						</Box>
					</Box>
				)}
				{schemaDiffs?.customTypes && (
					<Box className={'sectionBox'} padding={24}>
						<Label variant={'h6'} weight={'medium'} mb={8}>
							Custom Types
						</Label>
						<Label variant={'body1'} weight={'regular'}>
							MODIFIED
						</Label>
					</Box>
				)}
			</>
		);
	}

	return (
		<Box
			className={classNames('rsSchemaPreview', { open: props.open, expand: expand })}
			elementRef={previewRef as React.RefObject<HTMLDivElement>}
		>
			<PageHeader
				title={'Preview'}
				rightNode={
					<Button
						look={'containedPrimary'}
						onClick={submitSchema}
						disabled={!schemaService.isSchemaChanged(schema)}
						small
					>
						Submit
					</Button>
				}
				leftNode={
					<Icon
						className={'expandShrink'}
						iconImg={expand ? 'icon-chevron-right' : 'icon-chevron-left'}
						onClick={() => setExpand((prev) => !prev)}
					/>
				}
			/>
			{isDownloadingPreview ? (
				<Label variant={'h5'} weight={'bold'} mt={24} ml={24}>
					Loading Preview...
				</Label>
			) : (
				<Box className={'content'}>{expand ? renderExpanded() : renderShrunk()}</Box>
			)}
		</Box>
	);
};

export default SchemaPreview;
