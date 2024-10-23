/// <reference types="pg" />

declare module '@wmfs/pg-info' {
	export interface Info {
		generated: string;
		schemas: object;
	}

	interface Config {
		client: import('pg').Client;
		schemas?: string[];
	}

	export default function pgInfo(config: Config): Promise<Info>;
}
