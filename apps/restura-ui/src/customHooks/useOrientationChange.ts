import { useEffect, useState } from 'react';

export default function useOrientationChange() {
	const [orientationChangedCount, setOrientationChangedCount] = useState<number>(0);
	useEffect(() => {
		window.addEventListener('orientationchange', function (event) {
			setOrientationChangedCount((count) => {
				return count + 1;
			});
		});
	}, []);

	return orientationChangedCount;
}
