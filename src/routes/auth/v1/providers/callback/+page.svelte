<script lang="ts">
	import { onMount } from 'svelte';

	let error = $state('');

	onMount(async () => {
		const query = new URL(window.location.href).searchParams;
		// if (query.error) {
		// 	// if we have any error, do not proceed like normal and only show the error
		// 	error = `${query.error}: ${query.error_description}`;
		// 	return;
		// }

		let data = {
			state: query.get('state'),
			code: query.get('code'),
			pkce_verifier: localStorage.getItem('pkceVerifierUpstream'),
			xsrf_token: localStorage.getItem('providerToken')
		};
		let res = await fetch('/auth/v1/providers/callback', {
			method: 'post',
			body: JSON.stringify(data),
			headers: [['csrf-token', localStorage.getItem('csrfToken')!]]
		});

		if (res.status === 202) {
			// -> all good
			window.location.replace(res.headers.get('location')!);
		} else if (res.status === 200) {
			// -> all good, but needs additional passkey validation
			// error = '';
			// webauthnData = await res.json();
		} else if (res.status === 204) {
			// in case of a 204, we have done a user federation on an existing account -> just redirect
			window.location.replace('/auth/v1/account');
		} else if (res.status === 403) {
			// we will get a forbidden if for instance the user already exists but without
			// any upstream provider link (or the wrong one)
			let body = await res.json();
			error = body.message;
		} else if (res.status === 406) {
			// TODO: mfa
			// // 406 -> client forces MFA while the user has none
			// error = t.clientForceMfa;
			// clientMfaForce = true;
		} else {
			let body = await res.text();
			error = `HTTP ${res.status}: ${body}`;
		}
	});
</script>

<main class="flex items-center justify-center pt-8">
	{#if error}
		<aside class="alert variant-ghost-error min-w-[50%] max-w-3xl">
			<!-- Message -->
			<div class="alert-message">
				<h3 class="h3">Error Logging In</h3>
				<p>{error}</p>
			</div>
		</aside>
	{/if}
</main>
