/// <reference types="vite-plugin-css-export/client" />
// Values are exported in themes.scss file
// Import them into JS code with import themes from  '../../path/themes.scss';
// Then use like themes.primaryColor
declare module '*.scss?export' {
	const value: {
		neutralWhite: string;
		neutralBeige50: string;
		neutralBeige100: string;
		neutralBeige200: string;
		neutralBeige300: string;
		neutralBeige400: string;
		neutralBeige500: string;
		neutralBeige600: string;
		neutralBeige700: string;
		neutralBeige800: string;
		neutralBeige900: string;
		neutralBlack: string;

		neutralWhite50: string;

		// Primary colors
		primaryRed50: string;
		primaryRed100: string;
		primaryRed300: string;
		primaryRed500: string;
		primaryRed700: string;
		primaryRed900: string;
		primaryRed500_50: string;

		// Burnt Orange
		burntOrange: string;

		// Secondary colors
		secondaryOrange500: string;

		success: string;
		accentErrorDark: string;

		// Gradients
		gradient90Deg: string;
		gradient90Deg_20: string;
	};
	export = value;
}
