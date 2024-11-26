import { boundMethod } from 'autobind-decorator';
import cloneDeep from 'lodash.clonedeep';
import { ResturaSchema, RouteData } from './schemas/resturaSchema.js';
import { PsqlEngine } from './sql/PsqlEngine.js';
import { SchemaChangeValue, SchemaPreview } from './types/resturaTypes.js';

class CompareSchema {
	@boundMethod
	async diffSchema(
		newSchema: ResturaSchema,
		latestSchema: ResturaSchema,
		psqlEngine: PsqlEngine
	): Promise<SchemaPreview> {
		const endPoints = this.diffEndPoints(newSchema.endpoints![0].routes, latestSchema.endpoints![0].routes);
		const globalParams = this.diffStringArray(newSchema.globalParams, latestSchema.globalParams);
		const roles = this.diffStringArray(newSchema.roles, latestSchema.roles);

		let commands = '';
		if (JSON.stringify(newSchema.database) !== JSON.stringify(latestSchema.database))
			commands = await psqlEngine.diffDatabaseToSchema(newSchema);

		const hasCustomTypesChanged =
			JSON.stringify(newSchema.customTypes) !== JSON.stringify(latestSchema.customTypes);
		const schemaPreview: SchemaPreview = {
			endPoints,
			globalParams,
			roles,
			commands,
			customTypes: hasCustomTypesChanged
		};
		return schemaPreview;
	}

	@boundMethod
	private diffStringArray(newArray: string[], originalArray: string[]): SchemaChangeValue[] {
		const stringsDiff: SchemaChangeValue[] = [];
		const originalClone = new Set(originalArray);
		newArray.forEach((item) => {
			const originalIndex = originalClone.has(item);
			if (!originalIndex) {
				stringsDiff.push({
					name: item,
					changeType: 'NEW'
				});
			} else {
				originalClone.delete(item);
			}
		});
		originalClone.forEach((item) => {
			stringsDiff.push({
				name: item,
				changeType: 'DELETED'
			});
		});
		return stringsDiff;
	}

	@boundMethod
	private diffEndPoints(newEndPoints: RouteData[], originalEndpoints: RouteData[]): SchemaChangeValue[] {
		const originalClone = cloneDeep(originalEndpoints);
		const diffObj: SchemaChangeValue[] = [];
		newEndPoints.forEach((endPoint) => {
			const { path, method } = endPoint;
			const endPointIndex = originalClone.findIndex((original) => {
				return original.path === endPoint.path && original.method === endPoint.method;
			});
			if (endPointIndex === -1) {
				diffObj.push({
					name: `${method} ${path}`,
					changeType: 'NEW'
				});
			} else {
				const original = originalClone.findIndex((original) => {
					return this.compareEndPoints(endPoint, original);
				});
				if (original === -1) {
					diffObj.push({
						name: `${method} ${path}`,
						changeType: 'MODIFIED'
					});
				}
				originalClone.splice(endPointIndex, 1);
			}
		});
		originalClone.forEach((original) => {
			const { path, method } = original;
			diffObj.push({
				name: `${method} ${path}`,
				changeType: 'DELETED'
			});
		});
		return diffObj;
	}

	@boundMethod
	private compareEndPoints(endPoint1: RouteData, endPoint2: RouteData): boolean {
		return JSON.stringify(endPoint1) === JSON.stringify(endPoint2);
	}
}

const compareSchema = new CompareSchema();
export default compareSchema;
