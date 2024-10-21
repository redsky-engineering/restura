import { useEffect, useState } from 'react';

const DEFAULT_MOBILE_SIZE_BREAKPOINT = 799;

export default function useIsAtBreakpoint(breakpointWidth?: number): boolean {
	breakpointWidth = breakpointWidth || DEFAULT_MOBILE_SIZE_BREAKPOINT;
	let [isAtBreakpoint, setIsAtBreakpoint] = useState<boolean>(window.innerWidth <= breakpointWidth);

	useEffect(() => {
		function checkForBreakpoint() {
			setIsAtBreakpoint(window.innerWidth <= breakpointWidth!);
		}
		window.addEventListener('resize', checkForBreakpoint);
		return () => window.removeEventListener('resize', checkForBreakpoint);
	}, [window.innerWidth, breakpointWidth]);

	return isAtBreakpoint;
}
