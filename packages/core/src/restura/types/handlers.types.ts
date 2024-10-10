export type RoleEnforcedObject = {
	role: string;
	[key: string]: string | number | boolean | object | null; // Other keys with any JSON-compatible value type
};

export interface Handlers {
	// Need to provide a callback for restura to authenticate the request
	// If the request is valid, call onValid
	// eslint-disable-next-line  @typescript-eslint/no-explicit-any
	authenticate?: (req: Request, onValid: any) => void;
}
