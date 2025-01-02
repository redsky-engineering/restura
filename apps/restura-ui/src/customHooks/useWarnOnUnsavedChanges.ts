import { useEffect } from 'react';

export default function useWarnOnUnsavedChanges(hasUnsavedChanges: boolean) {
	// Check for beforeunload event
	useEffect(() => {
		if (!hasUnsavedChanges) return;
		function onBeforeUnload(e: BeforeUnloadEvent) {
			e.preventDefault();
			e.returnValue = 'Are you sure you want to leave without saving your changes?';
		}

		window.addEventListener('beforeunload', onBeforeUnload, { capture: true });
		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload, { capture: true });
		};
	}, [hasUnsavedChanges]);
}
