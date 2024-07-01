<script lang="ts">
	import { checkResponse } from '$lib/utils';
	import { onMount } from 'svelte';

	onMount(async () => {
		const url = new URL(window.location.href);
		const postLogoutUri = decodeURIComponent(
			url.searchParams.get('post_logout_redirect_uri') || '/'
		);
		const token = url.searchParams.get('id_token_hint');
		const state = url.searchParams.get('state');

		const csrf = localStorage.getItem('csrfToken');

		const req = {
			id_token_hint: token || undefined,
			post_logout_redirect_uri: postLogoutUri,
			state: state || undefined
		};

		try {
			const resp = await fetch('/auth/v1/oidc/logout', {
				method: 'post',
				headers: [['csrf-token', csrf!]],
				body: JSON.stringify(req)
			});
			await checkResponse(resp);
		} catch (e) {
			console.log(e);
		} finally {
			localStorage.removeItem('csrfToken');
			window.location.href = postLogoutUri;
		}
	});
</script>
