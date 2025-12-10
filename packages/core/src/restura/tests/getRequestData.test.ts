import { expect } from 'chai';
import { Schema } from 'jsonschema';
import { RsRequest } from '../types/customExpressTypes.js';
import { getRequestData } from '../validators/requestValidator.js';

describe('getRequestData', () => {
	describe('GET/DELETE requests', () => {
		it('should handle empty query parameters', () => {
			const request = {
				method: 'GET',
				query: {}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({});
		});

		it('should convert string numbers to numbers', () => {
			const request = {
				method: 'GET',
				query: {
					id: '123',
					count: '42'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					id: {
						type: 'number'
					},
					count: {
						type: 'number'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				id: 123,
				count: 42
			});
		});

		it('should convert string booleans to booleans', () => {
			const request = {
				method: 'GET',
				query: {
					isActive: 'true',
					isDeleted: 'false'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					isActive: {
						type: 'boolean'
					},
					isDeleted: {
						type: 'boolean'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				isActive: true,
				isDeleted: false
			});
		});

		it('should handle string values', () => {
			const request = {
				method: 'GET',
				query: {
					name: 'John',
					email: 'john@example.com'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					name: {
						type: 'string'
					},
					email: {
						type: 'string'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				name: 'John',
				email: 'john@example.com'
			});
		});

		it('should handle array parameters and remove [] from key names', () => {
			const request = {
				method: 'GET',
				query: {
					'ids[]': ['1', '2', '3'],
					'names[]': ['John', 'Jane']
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					ids: {
						type: 'array',
						items: {
							type: 'number'
						}
					},
					names: {
						type: 'array',
						items: {
							type: 'string'
						}
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				ids: [1, 2, 3],
				names: ['John', 'Jane']
			});
		});

		it('should handle mixed array types', () => {
			const request = {
				method: 'GET',
				query: {
					'mixed[]': ['1', 'true', 'John', '42']
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					mixed: {
						type: 'array',
						items: {
							type: 'string'
						}
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				mixed: ['1', 'true', 'John', '42']
			});
		});

		it('should coerce string array to number array', () => {
			const request = {
				method: 'GET',
				query: {
					'ids[]': ['1', '2', '3']
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					ids: {
						type: 'array',
						items: {
							type: 'number'
						}
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				ids: [1, 2, 3]
			});
			expect(typeof (result as { ids: number[] }).ids[0]).to.equal('number');
		});

		it('should handle array parameters with only one value', () => {
			const request = {
				method: 'GET',
				query: { 'ids[]': ['1'] }
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					ids: {
						type: 'array',
						items: {
							type: 'number'
						}
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				ids: [1]
			});
		});
	});

	describe('POST/PUT/PATCH requests', () => {
		it('should return body data directly', () => {
			const request = {
				method: 'POST',
				body: {
					name: 'John',
					age: 30,
					isActive: true
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				name: 'John',
				age: 30,
				isActive: true
			});
		});

		it('should handle empty body', () => {
			const request = {
				method: 'POST',
				body: {}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({});
		});

		it('should handle null body', () => {
			const request = {
				method: 'POST',
				body: null
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {}
			};

			const result = getRequestData(request, schema);
			expect(result).to.equal(null);
		});
	});

	describe('Edge cases', () => {
		it('should handle undefined values', () => {
			const request = {
				method: 'GET',
				query: {
					name: undefined,
					age: '30'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					name: {
						type: 'string'
					},
					age: {
						type: 'number'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				name: undefined,
				age: 30
			});
		});

		it('should handle empty string values', () => {
			const request = {
				method: 'GET',
				query: {
					name: '',
					age: '30'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					name: {
						type: 'string'
					},
					age: {
						type: 'number'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				name: '',
				age: 30
			});
		});

		it('should handle special characters in parameter names', () => {
			const request = {
				method: 'GET',
				query: {
					'user.name': 'John',
					'user-age': '30'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					'user.name': {
						type: 'string'
					},
					'user-age': {
						type: 'number'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				'user.name': 'John',
				'user-age': 30
			});
		});

		it('should not coerce values that are strings but look like numbers', () => {
			const request = {
				method: 'GET',
				query: {
					zipcode: '04684'
				}
			} as unknown as RsRequest<unknown>;

			const schema: Schema = {
				type: 'object',
				properties: {
					zipcode: {
						type: 'string'
					}
				}
			};

			const result = getRequestData(request, schema);
			expect(result).to.deep.equal({
				zipcode: '04684'
			});
		});
	});
});
