<script>
	import { env } from '$env/dynamic/public';
</script>

<svelte:head>
	<title>Feedback Sent | {env.PUBLIC_INSTANCE_NAME}</title>
</svelte:head>

<main class="flex flex-col items-center">
	<div class="card mt-12 flex w-[600px] max-w-[90%] flex-col gap-4 p-8">
		Your feedback was sent! Thank you for leaving a message, we may get back to you if you supplied
		an email address.
	</div>
</main>
