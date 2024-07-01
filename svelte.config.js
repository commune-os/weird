import adapter from '@sveltejs/adapter-node';

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			// TODO: Evaluate ways to turn this off only for the `/auth/v1/oidc/token` endpoint.
			// We have to disable it for now because it breaks the OIDC client flow.
			checkOrigin: false
		}
	}
};

export default config;
