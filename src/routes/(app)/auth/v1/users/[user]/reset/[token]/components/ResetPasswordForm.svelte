<script lang="ts">
	interface Props {
		error: string;
		onsubmit: (event: SubmitEvent) => void;
	}

	const { error, onsubmit }: Props = $props();
</script>

<form class="card mt-12 flex w-[600px] max-w-[90%] flex-col gap-4 p-8" {onsubmit}>
	<h1 class="my-3 text-2xl">Set Password</h1>

	{#if error}
		<aside class="alert variant-ghost-error">
			<div class="alert-message">
				<p>{error}</p>
			</div>
		</aside>
	{/if}

	<p>Set a new password for your account.</p>
	<label class="label">
		<span>Password</span>
		<input name="password" class="input" type="password" placeholder="Password" />
	</label>

	<button type="submit" class="variant-filled btn">Set Password</button>
</form>
