declare module 'Banner';
declare module 'window';
declare module '*.png' {
	const value: any;
	export = value;
}
declare module '*.webp';
declare module '*.jpg' {
	const value: any;
	export = value;
}
declare module '*.jpeg' {
	const value: any;
	export = value;
}
declare module '*.svg' {
	const value: any;
	export = value;
}

interface Window {
	sf: any;
}

declare var Prism: any;

declare namespace JSX {
	interface IntrinsicElements {
		rsButton: any;
		div: any;
		Banner: any;
		Button: any;
		label: any;
		button: any;
		img: any;
		span: any;
	}
}

// Used to help with vite-imagetools. Add a &imagetools to the end of your import
declare module '*&imagetools' {
	/**
	 * actual types
	 * - code https://github.com/JonasKruckenberg/imagetools/blob/main/packages/core/src/output-formats.ts
	 * - docs https://github.com/JonasKruckenberg/imagetools/blob/main/docs/guide/getting-started.md#metadata
	 */
	const out;
	export default out;
}
