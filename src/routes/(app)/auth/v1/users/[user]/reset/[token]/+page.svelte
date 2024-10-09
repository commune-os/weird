<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { checkResponse } from '$lib/utils/http';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	import ResetPasswordPage from './components/ResetPasswordPage.svelte';

	const { data }: { data: PageData } = $props();

	let error = $state('');

	onMount(() => {
		localStorage.setItem('justResetPassword', 'false');
	});

	async function onsubmit(e: SubmitEvent) {
		e.preventDefault();

		const formData = new FormData(e.target as HTMLFormElement);
		const password = formData.get('password') as string;

		try {
			const resp = await fetch(`/auth/v1/users/${data.user}/reset`, {
				method: 'put',
				headers: [['pwd-csrf-token', data.csrfToken!]],
				body: JSON.stringify({ magic_link_id: data.token, password })
			});
			await checkResponse(resp);
			localStorage.setItem('justResetPassword', 'true');
			window.location.replace('/my-profile');
		} catch (e) {
			const { data } = e as { data: string };
			const { message } = JSON.parse(data);
			error = message;
		}
	}

	const pageTitle = `Set Password | ${env.PUBLIC_INSTANCE_NAME}`;
</script>

<ResetPasswordPage {pageTitle} {error} {onsubmit} csrfToken={data.csrfToken} />
