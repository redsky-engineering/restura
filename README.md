# Restura

A schema-driven, low-code API framework for Node.js and Express. Define your API endpoints declaratively via a JSON schema and let Restura handle routing, validation, SQL generation, and type generation automatically.

## Repository Structure

This is a monorepo managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Nx](https://nx.dev/) for task orchestration.

```
restura/
├── packages/
│   ├── core/           # @restura/core - Main library
│   └── internal/       # @restura/internal - Shared internal utilities
├── apps/
│   ├── restura-express/  # Example Express app for testing
│   └── restura-ui/       # Schema editor UI
├── pnpm-workspace.yaml
└── nx.json
```

## Packages

### @restura/core

The core library providing:

- **Schema-Driven Routing** – Define endpoints, methods, request/response types, and authorization rules in a JSON schema
- **Automatic SQL Generation** – Generate PostgreSQL queries from your schema with support for joins, filters, and pagination
- **Schema Diffing** – Preview and apply database migrations by comparing schema changes
- **Type Generation** – Auto-generate TypeScript types for your API and models
- **Request Validation** – Built-in validation for request parameters, body, and query strings
- **Response Validation** – Validate API responses against your schema
- **Authentication & Authorization** – Role and scope-based access control middleware
- **Custom API Support** – Extend with custom route handlers when you need more control
- **File Uploads** – Integrated multipart form handling with Multer

```bash
pnpm add @restura/core
```

### @restura/internal

Internal utilities shared across Restura packages:

- Configuration loading and validation
- Common utility functions

```bash
pnpm add @restura/internal
```

## Example Apps

### restura-express

A sample Express application demonstrating how to integrate Restura into your project. Includes:

- Docker Compose setup for local PostgreSQL
- Example schema configuration
- Development scripts

```bash
# Start the local database
pnpm --filter restura-express startDevDockerDb

# Run the development server
pnpm express:dev
```

### restura-ui

A React-based UI for visually editing and managing your Restura schema. Built with Vite.

```bash
# Start the UI development server
pnpm ui:start
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL (for running the example app)

### Installation

```bash
# Clone the repository
git clone https://github.com/redsky-engineering/restura.git
cd restura

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint

# Build all packages
pnpm build
```

## Basic Usage

```typescript
import express from 'express';
import { restura, PsqlPool } from '@restura/core';

const app = express();
const pool = new PsqlPool(/* connection config */);

// Define your authentication handler
const authHandler = async (req) => {
	// Return user details: { role, scopes }
	return { role: 'user', scopes: ['read'] };
};

// Initialize Restura
await restura.init(app, authHandler, pool);

app.listen(3000);
```

## Configuration

Restura uses a `restura.config.mjs` file for configuration:

```javascript
export default {
	schemaFilePath: './restura.schema.json',
	generatedTypesPath: './src/generated',
	customApiFolderPath: './src/api',
	fileTempCachePath: './tmp',
	authToken: 'your-restura-admin-token',
	scratchDatabaseSuffix: '_scratch'
};
```

## License

MIT © [RedSky Engineering](https://github.com/redsky-engineering)
