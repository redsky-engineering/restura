import fs from 'fs';
import * as prettier from 'prettier';

// Your type string (truncated for the sake of example here)
const typeString =
	"export interface FilteredUser {\n    id: number;\n\tcompanyId: number;\n\tfirstName: string;\n\tlastName: string;\n\temail: string;\n\trole: string;\n\tphone: string;\n\ttitle: string;\n\tlastLoginOn: string;\n}\n\nexport interface AuthResponse {\n    token: string;\n    tokenExp: string;\n    refreshToken: string;\n    refreshTokenExp: string;\n}\n\nexport interface PricingDetails {\n    netTermsDays: number;\n    renewsOnCalenderDay: number;\n    unitPricing: {\n        [key: string] : {\n            monthlyCents: number;\n        }\n    }\n}\n\nexport type StandardOrderTypes = 'ASC' | 'DESC' | 'RAND' | 'NONE';\n\t\nexport interface ActivityLogSiteRequest extends Restura.PageQuery {\n    siteId: number;\n}\n\nexport type ActionTypes = 'ACCOUNT_OWNER_TRANSFER'\n\t    | 'INVOICE_SETTINGS_UPDATE'\n\t    | 'USER_UPDATE'\n\t    | 'USER_ACCESS_REVOKE'\n\t    | 'UNIT_CREATE'\n\t    | 'UNIT_ASSIGN'\n\t    | 'UNIT_UNASSIGN'\n\t\t| 'SITE_UPDATE'\n\t    | 'SITE_ARCHIVE'\n\t\t| 'SITE_RESTORE'\n\t\t| 'USER_DELETE'\n\t\t| 'USER_INVITE'\n\t    | 'SITE_CREATE'\n\t\t| 'BILLING_ADDRESS_UPDATE'\n\t\t| 'BILLING_CONTACT_UPDATE'\n\t    | 'COMPANY_UPDATE'\n\t    | 'COMPANY_CREATE'\n\t\t| 'UNIT_ARCHIVE'\n\t\t| 'UNIT_RESTORE'\n\t\t| 'UNIT_UNLINK'\n\t\t| 'FIRMWARE_UPDATE'\n\t\t| 'PASSWORD_UPDATE'\n\t\t| 'PHONE_VERIFY'\n\t    | 'EMAIL_VERIFY'\n\t\t| 'PHONE_UPDATE'\n\t\t| 'EMAIL_UPDATE'\n\t\t| 'CLIP_UPDATE'\n\t\t| 'CLIP_CREATE'\n\t    | 'QUICK_VIEW_UPDATE'\n\t\t| 'QUICK_VIEW_CREATE'\n\t\t| 'USER_ACCESS_GRANT';\n\nexport interface BaseActivityLogResponse {\n    id: number;\n\tcreatedOn: string;\n\taction: ActionTypes;\n\tinitiatorId: number;\n\tinitiatorFirstName: string;\n\tinitiatorLastName: string;\n\tdescription: string;\n}\n\nexport type ActivityLogSiteResponse = BaseActivityLogResponse;\nexport type ActivityLogCompanyResponse = BaseActivityLogResponse;\n\nexport interface ActivityLogCompanyRequest extends Restura.PageQuery {\n\tcompanyId: number;\n}\n\nexport interface StorageDetails {\n\tspaceConsumedMb: number;\n\thoursOfRecording: number;\n\tcurrentBitRateMBps: number;\n}\n\nexport interface UnitHealth {\n    gpsLatitude: number;\n    gpsLongitude: number;\n    gpsLastUpdatedOn: string;\n\tstorageDetails: Record<string, StorageDetails>;\n    firmwareVersion: string;\n    cameraStatus: CameraStatus;\n    unitIssues: UnitIssueList;\n    componentIssues: {\n        componentId: number;\n        issues: ComponentIssueList;\n    }[];\n}\n\nexport interface CameraStatus {\n    online: number;\n    total: number;\n}\n\nexport interface UnitConfig {\n    expectedFirmwareVersion: string;\n\trestPublicKey: string;\n\tcomponents: {\n\t    id: number;\n\t    displayName: string;\n\t\ttype: Model.Component['type'];\n\t\tconfig: Record<string, unknown>;\n\t}[];\n}\n\nexport interface GpsPosition {\n    latitude: number;\n    longitude: number;\n}\n\nexport interface CallList {\n  name: string;\n  email: string;\n  primaryPhone: string;\n  secondaryPhone?: string;\n  password?: string;\n}\n\nexport interface CompanyContact {\n  label: string;\n  contactInfo: string;\n}\n\nexport interface StandardOperatingProcedure {\n  question: string;\n  response?: string;\n}\n\nexport interface ArmingScheduleEntry {\n  day: string; \n  armTime: string; \n  disarmTime: string;\n}\n\nexport interface ArmingSchedule {\n  timeZone: string;\n  schedule: ArmingScheduleEntry[];\n}\n\nexport interface MonitoringInfo {\n  callList: CallList[];\n  companyContacts: CompanyContact[];\n  standardOperatingProcedures: StandardOperatingProcedure[];\n  armingSchedule: ArmingSchedule;\n}\n\nexport interface UserSite{\n    userId: number;\n    siteIds: number[]\n}\n\nexport interface UserDetails {\n    id: number;\n    firstName: string;\n    lastName: string;\n    email: string;\n    title: string;\n    siteCount: number;\n    companyName: string;\n    phone: string;\n    lastLoginOn: string;\n    isAccountOwner: boolean;\n    companyId: number;\n    role:\n       | \"SUPER_ADMIN\"\n       | \"ADMIN\"\n       | \"ADVANCED_VIEWER\"\n       | \"VIEWER\";\n}\n\nexport type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';\n\nexport interface BaseIssue<T extends string> {\n\tissueType: T;\n\tseverity: IssueSeverity;\n\tdescription: string;\n}\n\nexport type ComponentIssueTypes = 'NO_PTZ_VIDEO' | 'NO_STATIC_VIDEO' | 'CAMERA_IS_NOT_ONLINE';\nexport type UnitIssueTypes = 'MEDIA_SERVER_IS_NOT_ONLINE' | 'CAMERA_OUTAGE' | 'NO_GPS_SIGNAL';\n\nexport type ComponentIssue = BaseIssue<ComponentIssueTypes>;\nexport type UnitIssue = BaseIssue<UnitIssueTypes>;\n\nexport type ComponentIssueList = ComponentIssue[];\nexport type UnitIssueList = UnitIssue[];\n";

function splitTopLevelDefinitions(typeString) {
	// Use a regular expression to split by `export` followed by either `interface`, `type`, etc.
	//const splitRegex = /(?=^export\s+(?:interface|type|class)\s+)/gm;
	const splitRegex = /(?=^(?:export\s+)?(?:interface|type|class)\s+)/gm;

	// Split the input string and trim each resulting part
	return typeString
		.split(splitRegex)
		.map((item) => item.trim())
		.filter((item) => item);
}

// Call the function
const typeDefinitions = splitTopLevelDefinitions(typeString);

const schemaPrettyStr = await prettier.format(JSON.stringify({ customTypes: typeDefinitions }), {
	parser: 'json',
	...{
		trailingComma: 'none',
		tabWidth: 4,
		useTabs: true,
		endOfLine: 'lf',
		printWidth: 120,
		singleQuote: true
	}
});
fs.writeFileSync('test.json', schemaPrettyStr);
