# @restura/core

Restura is a powerful utility library for building Node.js backend applications with ease. It provides the core functionality to define, validate, and manage your REST API by generating Express.js routes from a schema file. Additionally, it integrates with PostgreSQL databases to handle SQL queries and offers comprehensive authentication and authorization capabilities.

`@restura/core` is the core library that powers the Restura framework. It provides the essential functionality to define your REST API, validate input parameters, generate SQL queries, and handle user authentication and authorization. The library is designed to be extensible and customizable, allowing you to build complex backend applications with minimal effort.

## Key Features

-   **Schema-Based REST API**: Define your entire REST API in a schema file, and automatically generate all the required Express.js routes.
-   **Input Validation**: Automatically detects and validates query and body parameters for all routes.
-   **Authentication & Authorization**: Built-in support for handling user authentication and role-based authorization.
-   **Database Query Generation**: Automatically generate and run SQL queries against a PostgreSQL database, returning properly formatted data.
-   **Post-Validation**: Ensures all data returned from the database is correctly formatted according to your schema.

## Installation and Simple Usage

Install the library using npm:

```bash
pnpm add @restura/core

// Todo add more usage instructions

```

## Full Documentation

Documentation can be found in the [official Restura documentation](https://restura.io/docs).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
