// @ts-check
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightThemeGalaxy from 'starlight-theme-galaxy';

// https://astro.build/config
export default defineConfig({
	site: 'https://restura.io',
	base: '/',
	integrations: [
		starlight({
			title: 'Restura',
			components: {
				PageFrame: './src/components/PageFrame.astro'
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/redsky-engineering/restura' }],
			sidebar: [
				{
					label: 'Start Here',
					items: [
						{ label: 'Quickstart', slug: 'quickstart' },
						{ label: 'Run the Visual Editor', slug: 'visual-editor' },
						{ label: 'FAQ', slug: 'faq' }
					]
				},
				{
					label: 'Tutorials',
					items: [
						{ label: 'Restura Setup From Scratch', slug: 'tutorials/setup-from-scratch' },
						{ label: 'Build a Blog REST API', slug: 'tutorials/blog-api' }
					]
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Create a Database Table', slug: 'guides/database-table' },
						{ label: 'Create a Standard Endpoint', slug: 'guides/standard-endpoint' },
						{ label: 'Create a Custom Endpoint', slug: 'guides/custom-endpoint' }
					]
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Config', slug: 'reference/config' },
						{ label: 'Schema', slug: 'reference/schema' },
						{
							label: 'Database',
							collapsed: true,
							items: [
								{ label: 'Tables', slug: 'reference/database/tables' },
								{ label: 'Columns & Types', slug: 'reference/database/columns' },
								{ label: 'Indexes & Foreign Keys', slug: 'reference/database/relationships' },
								{ label: 'Constraints', slug: 'reference/database/constraints' },
								{ label: 'Notifications', slug: 'reference/database/notifications' },
								{ label: 'Permissions', slug: 'reference/database/permissions' }
							]
						},
						{
							label: 'Endpoints',
							collapsed: true,
							items: [
								{ label: 'Overview', slug: 'reference/endpoints/overview' },
								{ label: 'Parameters', slug: 'reference/endpoints/parameters' },
								{ label: 'Responses', slug: 'reference/endpoints/responses' },
								{ label: 'SQL Queries', slug: 'reference/endpoints/sql-queries' },
								{ label: 'Custom Routes', slug: 'reference/endpoints/custom-routes' },
								{ label: 'Permissions', slug: 'reference/endpoints/permissions' }
							]
						},
						{
							label: 'Filter',
							collapsed: true,
							items: [
								{ label: 'Overview', slug: 'reference/filter' },
								{ label: 'New Syntax', slug: 'reference/filter/new-syntax' },
								{ label: 'Old Syntax', slug: 'reference/filter/old-syntax' },
								{ label: 'Advanced Topics', slug: 'reference/filter/advanced' }
							]
						}
					]
				},
				{
					label: 'Community',
					autogenerate: { directory: 'community' }
				}
			],
			customCss: ['./src/styles/global.css'],
			plugins: [starlightThemeGalaxy(), starlightLlmsTxt()]
		}),
		svelte()
	],

	vite: {
		plugins: [tailwindcss()]
	}
});
