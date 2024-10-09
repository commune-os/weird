<script lang="ts">
	interface props {
		pageTitle: string;
		csrfToken: string | undefined;
		error: string;
		onsubmit: (event: SubmitEvent) => void;
	}

	import ResetPasswordForm from './ResetPasswordForm.svelte';

	const { pageTitle, csrfToken, error, onsubmit }: props = $props();
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<main class="flex flex-col items-center">
	{#if csrfToken}
		<ResetPasswordForm {error} {onsubmit} />
	{:else}
		<aside class="alert variant-ghost-error m-8">
			<div class="alert-message">
				<p>
					This password reset link has expired, please request a new one if you still need to reset
					your password.
				</p>
			</div>
		</aside>
	{/if}
</main>
