import { assert, expect } from 'chai';
import { Done } from 'mocha';
import filterPsqlParser from '../sql/filterPsqlParser.js';

function test(inputString: string, expectedString: string, expectOldSyntax?: boolean) {
	const result = filterPsqlParser.parse(inputString);
	expect(result.sql).to.exist.with.length.greaterThan(0).and.is.equal(expectedString);
	expect(result.usedOldSyntax).to.equal(expectOldSyntax === true);
}

function testBadInput(inputString: string) {
	try {
		filterPsqlParser.parse(inputString);
		assert.fail(`The parsing should have failed on ${inputString}`);
	} catch (err: unknown) {
		if (err instanceof Error && err.name !== 'SyntaxError') {
			throw err;
		}
	}
}

describe('Filter Psql Parsing test - New Syntax', function () {
	describe('All 12 Operators', function () {
		it('Should parse equality - no operator (default)', function (done: Done) {
			test('(status,ACTIVE)', `("status" = 'ACTIVE')`);
			test('(name,John)', `("name" = 'John')`);
			test('(count,42)', `("count" = 42)`);
			done();
		});

		it('Should parse ne (not equal)', function (done: Done) {
			test('(status,ne,DELETED)', `("status" <> 'DELETED')`);
			test('(type,ne,admin)', `("type" <> 'admin')`);
			done();
		});

		it('Should parse in (matches any value)', function (done: Done) {
			test('(id,in,1|2|3)', `("id" IN (1, 2, 3))`);
			test('(status,in,ACTIVE|PENDING|PROCESSING)', `("status" IN ('ACTIVE', 'PENDING', 'PROCESSING'))`);
			done();
		});

		it('Should parse gt (greater than)', function (done: Done) {
			test('(price,gt,100)', `("price" > 100)`);
			test('(age,gt,21)', `("age" > 21)`);
			done();
		});

		it('Should parse gte (greater than or equal)', function (done: Done) {
			test('(price,gte,100)', `("price" >= 100)`);
			test('(age,gte,18)', `("age" >= 18)`);
			done();
		});

		it('Should parse lt (less than)', function (done: Done) {
			test('(stock,lt,10)', `("stock" < 10)`);
			test('(priority,lt,5)', `("priority" < 5)`);
			done();
		});

		it('Should parse lte (less than or equal)', function (done: Done) {
			test('(score,lte,100)', `("score" <= 100)`);
			test('(quantity,lte,0)', `("quantity" <= 0)`);
			done();
		});

		it('Should parse has (contains substring)', function (done: Done) {
			test('(name,has,test)', `("name"::text ILIKE '%test%')`);
			test('(description,has,important)', `("description"::text ILIKE '%important%')`);
			done();
		});

		it('Should parse sw (starts with)', function (done: Done) {
			test('(email,sw,admin)', `("email"::text ILIKE 'admin%')`);
			test('(code,sw,PRE)', `("code"::text ILIKE 'PRE%')`);
			done();
		});

		it('Should parse ew (ends with)', function (done: Done) {
			test('(file,ew,.pdf)', `("file"::text ILIKE '%.pdf')`);
			test('(email,ew,@gmail.com)', `("email"::text ILIKE '%@gmail.com')`);
			done();
		});

		it('Should parse null (is null)', function (done: Done) {
			test('(deletedAt,null)', `("deletedAt" IS NULL)`);
			test('(parentId,null)', `("parentId" IS NULL)`);
			done();
		});

		it('Should parse notnull (is not null)', function (done: Done) {
			test('(createdAt,notnull)', `("createdAt" IS NOT NULL)`);
			test('(assignedTo,notnull)', `("assignedTo" IS NOT NULL)`);
			done();
		});
	});

	describe('Column Path Syntax', function () {
		it('Should parse single-part column (column only)', function (done: Done) {
			test('(status,ACTIVE)', `("status" = 'ACTIVE')`);
			test('(userId,123)', `("userId" = 123)`);
			done();
		});

		it('Should parse two-part column (table.column)', function (done: Done) {
			test('(order.status,ACTIVE)', `("order"."status" = 'ACTIVE')`);
			test('(user.email,sw,admin)', `("user"."email"::text ILIKE 'admin%')`);
			test('(product.price,gt,100)', `("product"."price" > 100)`);
			done();
		});

		it('Should parse three-part column (table.column.jsonField)', function (done: Done) {
			test('(order.address.zip,has,123)', `("order"."address"->>'zip'::text ILIKE '%123%')`);
			test('(user.metadata.role,admin)', `("user"."metadata"->>'role' = 'admin')`);
			test('(config.settings.theme,ne,dark)', `("config"."settings"->>'theme' <> 'dark')`);
			done();
		});

		it('Should reject column paths with more than 3 parts', function (done: Done) {
			testBadInput('(a.b.c.d,value)');
			testBadInput('(table.col.json.nested.deep,has,x)');
			done();
		});
	});

	describe('Special Character Escaping', function () {
		it('Should handle escaped commas in values', function (done: Done) {
			test('(company,has,Acme\\, Inc.)', `("company"::text ILIKE '%Acme, Inc.%')`);
			test('(name,Doe\\, John)', `("name" = 'Doe, John')`);
			test('(address,has,123 Main St\\, Suite 100)', `("address"::text ILIKE '%123 Main St, Suite 100%')`);
			done();
		});

		it('Should handle escaped pipes in values', function (done: Done) {
			test('(description,has,Use A\\|B format)', `("description"::text ILIKE '%Use A|B format%')`);
			test('(formula,has,x\\|y\\|z)', `("formula"::text ILIKE '%x|y|z%')`);
			done();
		});

		it('Should handle escaped backslashes in values', function (done: Done) {
			// pg-format uses E'...' escape syntax for strings containing backslashes
			test('(path,sw,C:\\\\Windows)', `("path"::text ILIKE E'C:\\\\Windows%')`);
			test('(path,has,\\\\server\\\\share)', `("path"::text ILIKE E'%\\\\server\\\\share%')`);
			done();
		});

		it('Should handle spaces in values (no escaping needed)', function (done: Done) {
			test('(name,has,John Doe)', `("name"::text ILIKE '%John Doe%')`);
			test('(title,Hello World)', `("title" = 'Hello World')`);
			test('(desc,has,multiple   spaces)', `("desc"::text ILIKE '%multiple   spaces%')`);
			done();
		});

		it('Should handle multiple escaped characters in one value', function (done: Done) {
			// pg-format uses E'...' escape syntax for strings containing backslashes
			test(
				'(text,has,Test\\, with \\\\backslash\\| and pipe)',
				`("text"::text ILIKE E'%Test, with \\\\backslash| and pipe%')`
			);
			test('(data,A\\, B\\| C\\\\D)', `("data" = E'A, B| C\\\\D')`);
			done();
		});

		it('Should handle escaped pipes in IN operator values', function (done: Done) {
			test('(tags,in,red\\|green|blue|yellow)', `("tags" IN ('red|green', 'blue', 'yellow'))`);
			test('(codes,in,A\\|1|B\\|2|C\\|3)', `("codes" IN ('A|1', 'B|2', 'C|3'))`);
			done();
		});
	});

	describe('IN Operator Edge Cases', function () {
		it('Should handle IN with single value', function (done: Done) {
			test('(id,in,123)', `("id" IN (123))`);
			test('(status,in,ACTIVE)', `("status" IN ('ACTIVE'))`);
			done();
		});

		it('Should handle IN with many values', function (done: Done) {
			test('(id,in,1|2|3|4|5|6|7|8|9|10)', `("id" IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10))`);
			done();
		});

		it('Should handle IN with values containing spaces', function (done: Done) {
			test('(status,in,In Progress|On Hold|Complete)', `("status" IN ('In Progress', 'On Hold', 'Complete'))`);
			done();
		});
	});

	describe('Nesting and Grouping', function () {
		it('Should parse valid single-level grouping', function (done: Done) {
			test('((a,1)or(b,2))', `(("a" = 1) OR ("b" = 2))`);
			test('((x,gt,0)and(y,lt,100))', `(("x" > 0) AND ("y" < 100))`);
			done();
		});

		it('Should parse maximum valid nesting - groups at top level', function (done: Done) {
			test('((a,1)or(b,2))and((c,3)or(d,4))', `(("a" = 1) OR ("b" = 2)) AND (("c" = 3) OR ("d" = 4))`);
			test(
				'((x,gt,0)and(y,lt,10))or((z,gte,5)and(w,lte,20))',
				`(("x" > 0) AND ("y" < 10)) OR (("z" >= 5) AND ("w" <= 20))`
			);
			done();
		});

		it('Should parse negated groups', function (done: Done) {
			test('!((a,1)or(b,2))', `NOT (("a" = 1) OR ("b" = 2))`);
			test('((a,1)or(b,2))and!((c,3)or(d,4))', `(("a" = 1) OR ("b" = 2)) AND NOT (("c" = 3) OR ("d" = 4))`);
			done();
		});

		it('Should reject excessive nesting (depth > 1)', function (done: Done) {
			testBadInput('(((a,1)or(b,2))and(c,3))');
			testBadInput('((((a,1))))');
			testBadInput('(((a,1)or(b,2))or((c,3)and(d,4)))');
			done();
		});
	});

	describe('Empty Value Rejection', function () {
		it('Should reject empty values for equality', function (done: Done) {
			testBadInput('(field,)');
			testBadInput('(status, )');
			done();
		});

		it('Should reject empty values for operators', function (done: Done) {
			testBadInput('(field,gt,)');
			testBadInput('(field,has,)');
			testBadInput('(field,in,)');
			testBadInput('(field,ne,)');
			testBadInput('(field,sw,)');
			testBadInput('(field,ew,)');
			done();
		});

		it('Should reject malformed expressions', function (done: Done) {
			testBadInput('()');
			testBadInput('(field)');
			testBadInput('(,value)');
			testBadInput('(field,,value)');
			done();
		});
	});

	describe('Logical Operators', function () {
		it('Should parse AND operator', function (done: Done) {
			test('(a,1)and(b,2)', `("a" = 1) AND ("b" = 2)`);
			test('(a,1)and(b,2)and(c,3)', `("a" = 1) AND ("b" = 2) AND ("c" = 3)`);
			done();
		});

		it('Should parse OR operator', function (done: Done) {
			test('(a,1)or(b,2)', `("a" = 1) OR ("b" = 2)`);
			test('(a,1)or(b,2)or(c,3)', `("a" = 1) OR ("b" = 2) OR ("c" = 3)`);
			done();
		});

		it('Should parse mixed AND/OR', function (done: Done) {
			test('(a,1)and(b,2)or(c,3)', `("a" = 1) AND ("b" = 2) OR ("c" = 3)`);
			test('(a,1)or(b,2)and(c,3)', `("a" = 1) OR ("b" = 2) AND ("c" = 3)`);
			done();
		});

		it('Should parse negation with logical operators', function (done: Done) {
			test('!(a,1)and(b,2)', `NOT ("a" = 1) AND ("b" = 2)`);
			test('(a,1)and!(b,2)', `("a" = 1) AND NOT ("b" = 2)`);
			test('!(a,1)and!(b,2)', `NOT ("a" = 1) AND NOT ("b" = 2)`);
			done();
		});
	});

	describe('Case Sensitivity', function () {
		it('Should be case-insensitive for comparison operators', function (done: Done) {
			test('(price,GT,100)', `("price" > 100)`);
			test('(price,Gt,100)', `("price" > 100)`);
			test('(price,gT,100)', `("price" > 100)`);
			test('(price,GTE,100)', `("price" >= 100)`);
			test('(price,LT,100)', `("price" < 100)`);
			test('(price,LTE,100)', `("price" <= 100)`);
			test('(status,NE,deleted)', `("status" <> 'deleted')`);
			done();
		});

		it('Should be case-insensitive for string operators', function (done: Done) {
			test('(name,HAS,test)', `("name"::text ILIKE '%test%')`);
			test('(name,Has,test)', `("name"::text ILIKE '%test%')`);
			test('(email,SW,admin)', `("email"::text ILIKE 'admin%')`);
			test('(file,EW,.pdf)', `("file"::text ILIKE '%.pdf')`);
			done();
		});

		it('Should be case-insensitive for null operators', function (done: Done) {
			test('(deletedAt,NULL)', `("deletedAt" IS NULL)`);
			test('(deletedAt,Null)', `("deletedAt" IS NULL)`);
			test('(createdAt,NOTNULL)', `("createdAt" IS NOT NULL)`);
			test('(createdAt,NotNull)', `("createdAt" IS NOT NULL)`);
			done();
		});

		it('Should be case-insensitive for IN operator', function (done: Done) {
			test('(id,IN,1|2|3)', `("id" IN (1, 2, 3))`);
			test('(id,In,1|2|3)', `("id" IN (1, 2, 3))`);
			done();
		});

		it('Should be case-insensitive for logical operators', function (done: Done) {
			test('(a,1)AND(b,2)', `("a" = 1) AND ("b" = 2)`);
			test('(a,1)And(b,2)', `("a" = 1) AND ("b" = 2)`);
			test('(a,1)OR(b,2)', `("a" = 1) OR ("b" = 2)`);
			test('(a,1)Or(b,2)', `("a" = 1) OR ("b" = 2)`);
			done();
		});
	});

	describe('Mixed Old and New Syntax (Transition Period)', function () {
		it('Should still parse old syntax', function (done: Done) {
			// Verify old verbose syntax still works alongside new compact syntax
			test('(column:status,value:ACTIVE,type:exact)', `("status" = 'ACTIVE')`, true);
			test('(column:price,value:100,type:greaterThan)', `("price" > 100)`, true);
			test('(column:name,value:test,type:contains)', `("name"::text ILIKE '%test%')`, true);
			done();
		});

		it('Old syntax with logical operators still works', function (done: Done) {
			test('(column:id,value:251)or(column:id,value:278)', `("id" = 251) or ("id" = 278)`, true);
			test(
				'((column:id,value:251)or(column:id,value:278))AND(column:status,value:ACTIVE,type:exact)',
				`(("id" = 251) or ("id" = 278)) AND ("status" = 'ACTIVE')`,
				true
			);
			done();
		});
	});

	describe('Whitespace Handling', function () {
		it('Should allow whitespace around logical operators', function (done: Done) {
			test('(a,1) and (b,2)', `("a" = 1) AND ("b" = 2)`);
			test('(a,1)  or  (b,2)', `("a" = 1) OR ("b" = 2)`);
			test('(a,1)   AND   (b,2)   OR   (c,3)', `("a" = 1) AND ("b" = 2) OR ("c" = 3)`);
			done();
		});

		it('Should allow whitespace between column and comma', function (done: Done) {
			test('(status ,ACTIVE)', `("status" = 'ACTIVE')`);
			test('(price ,gt,100)', `("price" > 100)`);
			done();
		});

		it('Should allow whitespace after comma before operator/value', function (done: Done) {
			// Whitespace after comma is consumed by the grammar, not included in value
			test('(status, ACTIVE)', `("status" = 'ACTIVE')`);
			test('(price, gt, 100)', `("price" > 100)`);
			test('(id, in, 1|2|3)', `("id" IN (1, 2, 3))`);
			done();
		});

		it('Should preserve spaces within values', function (done: Done) {
			test('(name,John Doe)', `("name" = 'John Doe')`);
			test('(title,has,hello world)', `("title"::text ILIKE '%hello world%')`);
			done();
		});
	});
});

describe('Filter Psql Parsing test - Old Syntax', function () {
	describe('Type Operators', function () {
		it('Should parse type:exact (equals)', function (done: Done) {
			test('(column:id,value:15234,type:exact)', `("id" = 15234)`, true);
			test('(column:userId,value:15234,type:exact)', `("userId" = 15234)`, true);
			test('(column:id,value:25,type:exact)', `("id" = 25)`, true);
			done();
		});

		it('Should parse type:contains (ILIKE %value%)', function (done: Done) {
			test('(column:id,value:251,type:contains)', `("id"::text ILIKE '%251%')`, true);
			test('(column:id,value:4504055,type:contains)', `("id"::text ILIKE '%4504055%')`, true);
			done();
		});

		it('Should parse type:startsWith (ILIKE value%)', function (done: Done) {
			test('(column:id,value:251,type:startsWith)', `("id"::text ILIKE '251%')`, true);
			test('(column:id,value:Tanner B,type:startsWith)', `("id"::text ILIKE 'Tanner B%')`, true);
			done();
		});

		it('Should parse type:endsWith (ILIKE %value)', function (done: Done) {
			test('(column:id,value:251,type:endsWith)', `("id"::text ILIKE '%251')`, true);
			done();
		});

		it('Should parse type:greaterThan', function (done: Done) {
			test(
				'(column:id,value:215)AND(column:totalPriceCents,value:3069,type:greaterThan)',
				`("id" = 215) AND ("totalPriceCents" > 3069)`,
				true
			);
			test(
				'(column:id,value:215)AND(column:totalPriceCents,value:3070,type:greaterThan)',
				`("id" = 215) AND ("totalPriceCents" > 3070)`,
				true
			);
			done();
		});

		it('Should parse type:greaterThanEqual', function (done: Done) {
			test(
				'(column:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)',
				`("orderV2"."id" = 215) AND ("orderV2"."totalPriceCents" >= 3070) and ("totalPriceCents" <= 3070)`,
				true
			);
			done();
		});

		it('Should parse type:lessThan', function (done: Done) {
			test(
				'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThan)',
				`("id" = 215) AND  NOT ("totalPriceCents" < 3071)`,
				true
			);
			done();
		});

		it('Should parse type:lessThanEqual', function (done: Done) {
			test(
				'(column:id,value:215)AND!(column:totalPriceCents,value:3071,type:lessThanEqual)',
				`("id" = 215) AND  NOT ("totalPriceCents" <= 3071)`,
				true
			);
			done();
		});

		it('Should parse type:isNull', function (done: Done) {
			test(
				'(column:id,type:isNull)AND!(column:totalPriceCents,value:3071,type:lessThan)',
				`("id" IS NULL) AND  NOT ("totalPriceCents" < 3071)`,
				true
			);
			done();
		});

		it('Should default to equality when no type specified', function (done: Done) {
			test('(column:orderV2.id,value:215)', `("orderV2"."id" = 215)`, true);
			test(
				'(column:id)AND!(column:totalPriceCents,value:3071,type:lessThan)',
				`("id" IS NULL) AND  NOT ("totalPriceCents" < 3071)`,
				true
			);
			done();
		});
	});

	describe('Column Path Syntax', function () {
		it('Should parse single-part column', function (done: Done) {
			test('(column:id,value:15234,type:exact)', `("id" = 15234)`, true);
			test('(column:userId,value:15234,type:exact)', `("userId" = 15234)`, true);
			done();
		});

		it('Should parse two-part column (table.column)', function (done: Done) {
			test('(column:orderV2.id,value:215)', `("orderV2"."id" = 215)`, true);
			test(
				'(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)',
				`("orderV2"."totalPriceCents" >= 3070)`,
				true
			);
			done();
		});

		it('Should parse three-part column (table.column.jsonField)', function (done: Done) {
			test(
				`(column:order.billingAddress.zip,value:47,type:contains)`,
				`("order"."billingAddress"->>'zip'::text ILIKE '%47%')`,
				true
			);
			done();
		});

		it('Should reject column paths with more than 3 parts', function (done: Done) {
			testBadInput('(column:order.billingAddress.zip.zip2,value:47,type:contains)');
			done();
		});
	});

	describe('Logical Operators and Grouping', function () {
		it('Should parse AND operator', function (done: Done) {
			test(
				'(column:id,value:215)AND(column:totalPriceCents,value:3069,type:greaterThan)',
				`("id" = 215) AND ("totalPriceCents" > 3069)`,
				true
			);
			done();
		});

		it('Should parse OR operator', function (done: Done) {
			test(
				'(column:id,value:251,type:endsWith)or(column:id,value:278,type:endsWith)',
				`("id"::text ILIKE '%251') or ("id"::text ILIKE '%278')`,
				true
			);
			done();
		});

		it('Should parse mixed AND/OR with grouping', function (done: Done) {
			test(
				'((column:id,value:251)or(column:id,value:278)or(column:id,value:215))AND(column:status,value:PROCESSING,type:exact)',
				`(("id" = 251) or ("id" = 278) or ("id" = 215)) AND ("status" = 'PROCESSING')`,
				true
			);
			done();
		});

		it('Should parse deeply nested groups', function (done: Done) {
			test('(((column:id,value:4504055,type:contains)))', `((("id"::text ILIKE '%4504055%')))`, true);
			test(
				'!(!(column:userId,value:15234,type:exact)and!(column:name,value:jim,type:startsWith))or(column:name,value:bob)',
				` NOT ( NOT ("userId" = 15234) and  NOT ("name"::text ILIKE 'jim%')) or ("name" = 'bob')`,
				true
			);
			done();
		});
	});

	describe('Negation', function () {
		it('Should parse negated expressions', function (done: Done) {
			test('!(column:id,value:4504055,type:contains)', ` NOT ("id"::text ILIKE '%4504055%')`, true);
			test('!(column:id,value:4504055,type:startsWith)', ` NOT ("id"::text ILIKE '4504055%')`, true);
			test('!(column:userId,value:15234,type:exact)', ` NOT ("userId" = 15234)`, true);
			done();
		});

		it('Should parse negation with logical operators', function (done: Done) {
			test(
				'!(column:id,value:4504055,type:contains)and!(column:name,value:jim,type:endsWith)',
				` NOT ("id"::text ILIKE '%4504055%') and  NOT ("name"::text ILIKE '%jim')`,
				true
			);
			test(
				'(column:id,value:215)AND!(column:totalPriceCents,value:3070,type:greaterThan)',
				`("id" = 215) AND  NOT ("totalPriceCents" > 3070)`,
				true
			);
			done();
		});
	});

	describe('Whitespace Handling', function () {
		it('Should allow spaces in values', function (done: Done) {
			test('(column:id,value:Tanner B,type:startsWith)', `("id"::text ILIKE 'Tanner B%')`, true);
			test('(column:id,value:Tanner  B,type:startsWith)', `("id"::text ILIKE 'Tanner  B%')`, true);
			done();
		});

		it('Should allow tabs in values', function (done: Done) {
			test(`(column:id,value:Tanner	B,type:startsWith)`, `("id"::text ILIKE 'Tanner	B%')`, true);
			done();
		});

		it('Should allow newlines in values', function (done: Done) {
			test(
				`(column:id,value:Tanner
B,type:startsWith)`,
				`("id"::text ILIKE 'Tanner
B%')`,
				true
			);
			done();
		});

		it('Should allow whitespace around keywords', function (done: Done) {
			test('(column: id ,value: Tanner B ,type:startsWith)', `(" id "::text ILIKE ' Tanner B %')`, true);
			test(
				'! ( column :id, value :4504055,  type: contains )   and ! ( column :name, value :jim, type : endsWith ) ',
				` NOT ("id"::text ILIKE '%4504055%') and  NOT ("name"::text ILIKE '%jim')`,
				true
			);
			done();
		});

		it('Should allow whitespace around logical operators', function (done: Done) {
			test(
				'!(column:id,value:4504055,type:contains)   and!(column:name,value:jim,type:endsWith)',
				` NOT ("id"::text ILIKE '%4504055%') and  NOT ("name"::text ILIKE '%jim')`,
				true
			);
			test(
				'!(column:id,value:4504055,type :contains)   and!(column:name,value:jim,type:endsWith)',
				` NOT ("id"::text ILIKE '%4504055%') and  NOT ("name"::text ILIKE '%jim')`,
				true
			);
			done();
		});

		it('Should preserve trailing spaces in values', function (done: Done) {
			test(
				'!(column:id,value:4504055 ,  type:contains)   and!(column:name,value:jim,type:endsWith)',
				` NOT ("id"::text ILIKE '%4504055 %') and  NOT ("name"::text ILIKE '%jim')`,
				true
			);
			done();
		});
	});

	describe('Special Characters', function () {
		it('Should handle single quotes in values (SQL escaping)', function (done: Done) {
			test("(column:name,value:i'm,type:startsWith)", `("name"::text ILIKE 'i''m%')`, true);
			done();
		});

		it('Should handle periods in values', function (done: Done) {
			test('(column:name,value:John.Doe,type:startsWith)', `("name"::text ILIKE 'John.Doe%')`, true);
			done();
		});

		it('Should handle a period in the column name and the value', function (done: Done) {
			test('(column:user.last,value:John.Doe,type:startsWith)', `("user"."last"::text ILIKE 'John.Doe%')`, true);
			done();
		});
	});

	describe('Invalid Input Rejection', function () {
		it('Should reject misspelled column keyword', function (done: Done) {
			testBadInput(
				'(colum:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)'
			);
			done();
		});

		it('Should reject missing column keyword', function (done: Done) {
			testBadInput(
				'(value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(column:totalPriceCents,value:3070,type:lessThanEqual)'
			);
			done();
		});

		it('Should reject malformed expressions', function (done: Done) {
			testBadInput(
				'(colum:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)and(value:3070,column:totalPriceCents,,type:lessThanEqual)'
			);
			testBadInput('');
			testBadInput('()');
			done();
		});

		it('Should reject invalid prefix characters', function (done: Done) {
			testBadInput('%(column:id,value:4504055,type:contains)and!(column:name,value:jim,type:endsWith)');
			done();
		});

		it('Should reject invalid logical operators', function (done: Done) {
			testBadInput(
				'(colum:orderV2.id,value:215)AND(column:orderV2.totalPriceCents,value:3070,type:greaterThanEqual)xor(value:3070,column:totalPriceCents,,type:lessThanEqual)'
			);
			done();
		});
	});
});

describe('SQL Injection Prevention', function () {
	describe('Old Syntax - Rejected by Grammar', function () {
		it('Should reject semicolon-based injection attempts', function (done: Done) {
			testBadInput(
				"!(column:id,value:4504055,type:contains)and!(column:name,value:jim'; 'DROP TABLE userV2'; ,type:endsWith)"
			);
			testBadInput('(column:id,value:1; DROP TABLE users; --,type:exact)');
			done();
		});

		it('Should reject parentheses-based injection in values', function (done: Done) {
			testBadInput('(column:id,value:1) OR (1=1,type:exact)');
			testBadInput('(column:name,value:test) UNION SELECT * FROM users --,type:exact)');
			done();
		});
	});

	describe('New Syntax - Rejected by Grammar', function () {
		it('Should reject parentheses-based injection in values', function (done: Done) {
			// Parentheses are grammar delimiters and cannot appear unescaped in values
			testBadInput('(id,1) OR (1=1)');
			testBadInput('(name,test) UNION SELECT * FROM users --');
			done();
		});
	});

	describe('New Syntax - Safely Escaped by pg-format', function () {
		it('Should escape semicolon-based injection attempts as literals', function (done: Done) {
			// Semicolons are allowed in values and get escaped as harmless literals
			test('(id,1; DROP TABLE users; --)', `("id" = '1; DROP TABLE users; --')`);
			test("(name,has,test'; DELETE FROM users; --)", `("name"::text ILIKE '%test''; DELETE FROM users; --%')`);
			done();
		});

		it('Should escape SQL comment syntax as literals', function (done: Done) {
			// Comment syntax becomes literal strings, not actual SQL comments
			test('(id,1 -- comment)', `("id" = '1 -- comment')`);
			done();
		});

		it('Should safely escape single quotes in values', function (done: Done) {
			// Single quotes are escaped by pg-format, making injection harmless
			test("(name,O'Brien)", `("name" = 'O''Brien')`);
			test("(name,has,O'Malley)", `("name"::text ILIKE '%O''Malley%')`);
			test('(company,Test\'s "Company")', `("company" = 'Test''s "Company"')`);
			done();
		});

		it('Should safely escape classic OR injection attempts', function (done: Done) {
			// The ' OR '1'='1 pattern becomes a harmless literal string
			test("(password,' OR '1'='1)", `("password" = ''' OR ''1''=''1')`);
			test("(user,admin'--)", `("user" = 'admin''--')`);
			done();
		});

		it('Should safely escape UNION injection attempts in values', function (done: Done) {
			// UNION attempts become harmless literal strings when properly quoted
			test("(search,test' UNION SELECT * FROM users--)", `("search" = 'test'' UNION SELECT * FROM users--')`);
			done();
		});

		it('Should safely escape backslashes', function (done: Done) {
			// Backslashes are handled by pg-format with E'' syntax
			test('(path,C:\\\\Windows\\\\System32)', `("path" = E'C:\\\\Windows\\\\System32')`);
			done();
		});

		it('Should safely handle double quotes in values', function (done: Done) {
			// Double quotes in values are fine - they're inside single-quoted strings
			test('(name,John "The Rock" Doe)', `("name" = 'John "The Rock" Doe')`);
			done();
		});

		it('Should safely escape quotes in IN operator values', function (done: Done) {
			test("(status,in,it's|they're|we're)", `("status" IN ('it''s', 'they''re', 'we''re'))`);
			done();
		});
	});

	describe('Column Name Injection Prevention', function () {
		it('Should quote column names preventing injection', function (done: Done) {
			// Column names are always double-quoted, preventing injection
			// Even malicious column names become harmless identifiers
			test('(id,123)', `("id" = 123)`);
			test('(user_id,456)', `("user_id" = 456)`);
			done();
		});

		it('Should handle column names with special chars via quoting', function (done: Done) {
			// The grammar restricts column chars, but quoting adds defense in depth
			test('(table.column,value)', `("table"."column" = 'value')`);
			done();
		});
	});
});
