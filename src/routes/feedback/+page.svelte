<script lang="ts">
	import { env } from '$env/dynamic/public';

	let email = $state('');
	let message = $state('');
	let processing = $state(false);
</script>

<svelte:head>
	<title>Feedback | {env.PUBLIC_INSTANCE_NAME}</title>
</svelte:head>

<main class="flex flex-col items-center">
	<form class="card mt-12 flex w-[600px] max-w-[90%] flex-col gap-4 p-8" method="post">
		<h1 class="my-3 text-center text-2xl">Leave Feedback or Request Help</h1>

		<p class="text-surface-500-400-token text-center">
			If you're having trouble or you have feedback for {env.PUBLIC_INSTANCE_NAME} we'd appreciate a
			message, good or bad, let us know!
		</p>

		<label class="label">
			<span>Email <span class="text-surface-500-400-token text-sm">( optional )</span></span>
			<input class="input" type="text" name="email" placeholder="Email" bind:value={email} />
			<div class="text-surface-500-400-token ml-4 text-sm">
				If you specify an email we may get back to you.
			</div>
		</label>

		<label class="label">
			<span>Message</span>
			<textarea
				name="content"
				class="textarea"
				placeholder="Send us a message..."
				rows="5"
				bind:value={message}
			>
			</textarea>
		</label>

		<button class="variant-filled btn" type="submit" disabled={processing}> Send </button>
	</form>
</main>
