<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import RichMarkdownEditor from './RichMarkdownEditor.svelte';
	import MarkdownEditor from './MarkdownEditor.svelte';
	import type { SvelteComponent } from 'svelte';

	let {
		content = $bindable(),
		markdownMode = $bindable(false),
		maxLength,
		...attrs
	}: {
		content: string;
		maxLength?: number;
		markdownMode?: boolean;
	} & HTMLAttributes<HTMLDivElement> = $props();

	let shouldWiggle = $state(false);

	const contentProxy = {
		get value() {
			return content;
		},
		set value(value) {
			if (maxLength != undefined) {
				if (value.length > maxLength) {
					shouldWiggle = true;
					content = value.slice(0, maxLength);
				} else {
					content = value;
				}
			} else {
				content = value;
			}
		}
	};

	// svelte-ignore non_reactive_update
	let richEditorEl: SvelteComponent;
</script>

<div {...attrs} class="relative">
	<div class="absolute -left-4 -top-4 z-10 flex w-full flex-row gap-1">
		{#if maxLength != undefined}
			<div
				class="variant-filled badge transition-transform"
				class:too-long-content-badge={shouldWiggle}
				onanimationend={() => (shouldWiggle = false)}
			>
				Length: {content.length} / {maxLength}
			</div>
		{/if}

		<div class="flex-grow"></div>

		<button class="variant-filled badge" onclick={() => (markdownMode = !markdownMode)}
			>{markdownMode ? 'Switch to Rich Text' : 'Switch to Markdown'}</button
		>

		{#if !markdownMode}
			<button class="variant-filled badge" onclick={() => richEditorEl.focus()}
				>Click to Edit!</button
			>
		{/if}
	</div>
	{#if !markdownMode}
		<RichMarkdownEditor bind:this={richEditorEl} bind:content={contentProxy.value} />
	{:else}
		<MarkdownEditor bind:content={contentProxy.value} />
	{/if}
</div>

<style>
	@keyframes wiggle {
		0% {
			transform: rotate(0deg);
		}
		20% {
			transform: rotate(-10deg);
		}
		40% {
			transform: rotate(10deg);
		}
		60% {
			transform: rotate(-10deg);
		}
		80% {
			transform: rotate(10deg);
		}
		100% {
			transform: rotate(0deb);
		}
	}

	.too-long-content-badge {
		@apply variant-filled-error;
		animation: wiggle;
		animation-duration: 1s;
	}
</style>
