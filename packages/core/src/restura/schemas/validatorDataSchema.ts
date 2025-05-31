import { z } from 'zod/v4';
// created this to break up the restura.schema.ts file (running into dependency issues.)
export const validatorDataSchemeValue = z.union([z.string(), z.array(z.string()), z.number(), z.array(z.number())]);
export type ValidatorDataSchemeValue = z.infer<typeof validatorDataSchemeValue>;

export const validatorDataSchema = z
	.object({
		type: z.enum(['TYPE_CHECK', 'MIN', 'MAX', 'ONE_OF']),
		value: validatorDataSchemeValue
	})
	.strict();

export type ValidatorData = z.infer<typeof validatorDataSchema>;
