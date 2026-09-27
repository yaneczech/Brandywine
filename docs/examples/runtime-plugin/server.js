// Server part of the Hello example. Plain ESM: Node built-ins only, no npm packages.
// Everything Brandywine offers comes in through `ctx` (storage, user, log).

async function bump(ctx, key) {
	const value = (await ctx.storage.get(key)) ?? 0;
	await ctx.storage.set(key, value + 1);
}

async function stats(ctx) {
	return {
		uploads: (await ctx.storage.get('uploads')) ?? 0,
		pageSaves: (await ctx.storage.get('pageSaves')) ?? 0,
	};
}

export default {
	// Brandywine events
	on: {
		'asset.uploaded': (_payload, ctx) => bump(ctx, 'uploads'),
		'page.saved': (_payload, ctx) => bump(ctx, 'pageSaves'),
	},

	// Data for the admin page "stats" (the <hello-stats> element gets it as `data`)
	loaders: {
		stats,
	},

	// GET /api/x/hello/stats — return a Response or any JSON value
	api: {
		stats: {
			GET: (_request, ctx) => stats(ctx),
		},
	},

	// Markdown for the AI export
	toMarkdown: {
		hello_banner: (config) => [config.title && `**${config.title}**`, config.body].filter(Boolean).join('\n\n'),
	},
};
