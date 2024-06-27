import { sveltekit } from '@sveltejs/kit/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [wasm(), topLevelAwait(), sveltekit()],
	server: {
		port: 9523,
		strictPort: true
	}
});
