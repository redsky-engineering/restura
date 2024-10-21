import { useEffect, useState } from 'react';

const MobileAndDown = 599;
const TabletPortrait = 600;
const TabletLandscape = 900;
const desktopAndUp = 1160;

type ScreenSize = 'small' | 'medSmall' | 'medium' | '';

export default function useWindowResizeChange(): ScreenSize {
	const [screenSize, setScreenSize] = useState<ScreenSize>('');
	useEffect(() => {
		window.addEventListener('resize', onResize);
		function onResize(event: UIEvent) {
			const screen = event.target as Window;
			renderSize(screen.innerWidth);
		}
		function renderSize(screen: number) {
			if (screen <= MobileAndDown) setScreenSize('small');
			else if (screen <= TabletPortrait) setScreenSize('medSmall');
			else if (screen <= TabletLandscape) setScreenSize('medium');
			else if (screen >= desktopAndUp) setScreenSize('');
		}
		renderSize(window.innerWidth);

		return () => {
			window.removeEventListener('resize', onResize);
		};
	}, []);

	return screenSize;
}
