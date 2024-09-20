import { log } from '@restura/internal';

export function isEven(value: number): boolean {
	log('isEven called');
	return value % 2 === 0;
}
