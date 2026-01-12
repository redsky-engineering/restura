---
title: FAQ
description: Frequently asked questions about Restura
---

## What is Restura?

Restura is an open-source REST API engine for Node.js that generates fully-functional Express.js endpoints from a JSON schema. Similar to Hasura but for REST instead of GraphQL, Restura allows you to define your entire API—including database tables, routes, request validation, response structure, and authorization—in a single schema file. The companion visual UI lets you create and modify endpoints without writing code, while automatically generating TypeScript types for your request and response objects.

## Which problems does Restura solve?

Building REST APIs in Node.js typically involves repetitive boilerplate: route registration, request parsing/validation, SQL query construction, response formatting, and authorization checks. Restura eliminates this by generating all of this from a declarative schema. You define what data you want (tables, columns, joins, where clauses) and Restura handles the how—generating parameterized SQL queries, validating inputs against defined types (`TYPE_CHECK`, `ONE_OF`), enforcing role-based and scope-based permissions, and returning properly typed responses. When you need custom logic (like password hashing or external API calls), Restura's `CUSTOM_ONE`/`CUSTOM_ARRAY` route types let you drop into regular Express handlers while still benefiting from schema-driven validation and type generation.

## Who is Restura for?

Restura is designed for teams building data-driven applications with many REST endpoints. It's particularly valuable for organizations with multiple projects or developers of varying experience levels, as the schema provides a consistent, auditable standard for API design. Smaller projects with only a handful of endpoints may find the setup overhead outweighs the benefits, but for larger applications—especially those with complex relational data, fine-grained permissions, or frequent schema changes—Restura significantly reduces development time and maintenance burden.

## What inspired the creation of Restura?

At RedSky Engineering, we repeatedly wrote the same backend patterns across client projects: CRUD operations, paginated lists, user authentication flows, role-based access control. Rather than copy-pasting boilerplate and risking inconsistencies, we built Restura to codify these patterns into a reusable engine. The JSON schema became our single source of truth, enabling us to spin up new project APIs faster, onboard developers with a clear standard, and make database changes without hunting for broken queries. We continue to use Restura in production today.

## Why not use GraphQL?

GraphQL excels at flexible client-driven queries but introduces complexity: custom resolvers, N+1 query optimization, schema stitching, and a learning curve that can slow down teams. REST remains the industry standard with simpler debugging (standard HTTP tools), more predictable caching, and broader developer familiarity. Restura gives you the declarative power of schema-driven development while staying in REST territory—no new query language to learn, and responses match exactly what your schema defines.

## Is Restura maintained?

Yes. Restura is actively maintained and developed as it powers production applications at RedSky Engineering. The codebase includes comprehensive features like database migration diffing, TypeScript type generation, file upload handling, real-time database event triggers, and an expanding set of validators. We regularly add capabilities based on our internal needs.

## How can I contribute?

Contributions are welcome! Start by reviewing our [contribution guide](../community/contribution).
