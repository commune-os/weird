<script lang="ts">
	// TODO: Investigate deduplicating code between this and the profile page editor.

	import { env } from '$env/dynamic/public';
	import InlineTextEditor from '$lib/components/editors/InlineTextEditor.svelte';
	import type { SvelteComponent } from 'svelte';
	import type { Page } from '../types';
	import type { ActionData, PageData } from './$types';
	import { quintOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';
	import { onNavigate } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import CompositeMarkdownEditor from '$lib/components/editors/CompositeMarkdownEditor.svelte';
	import LinksEditor from '$lib/components/editors/LinksEditor.svelte';
	import { renderMarkdownSanitized } from '$lib/utils/markdown';
	import { page } from '$app/stores';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	let editingState: { editing: boolean; page: Page } = $state({
		editing: false,
		page: data.page
	});

	const formData = {
		get value() {
			return JSON.stringify(editingState.page);
		}
	};

	function startEdit() {
		if (data.profileMatchesUserSession) {
			editingState.page = data.page;
			editingState.editing = true;
		}
	}

	function cancelEdit(e?: Event) {
		if (e) e.preventDefault();
		editingState.editing = false;
		editingState.page = data.page;
	}

	onNavigate(() => cancelEdit());

	const [fadeOut, fadeIn] = crossfade({
		duration: 500,
		easing: quintOut
	});

	// svelte-ignore non_reactive_update
	let displayNameEditorEl: SvelteComponent;
</script>

<svelte:head>
	<title>
		{data.page.display_name} | {data.profile.display_name} |
		{env.PUBLIC_INSTANCE_NAME}
	</title>
</svelte:head>

<main class="mx-4 flex w-full flex-col items-center">
	<div
		class="card relative m-4 mt-12 flex w-full max-w-[700px] flex-col justify-center gap-4 p-8 text-xl"
	>
		<h1 class="relative mt-2 max-w-72 self-center text-center text-4xl">
			{#if !editingState.editing}
				{data.page.display_name}
			{:else}
				<button
					class="variant-filled badge absolute right-[-4em] top-[-2em] z-10"
					onclick={() => displayNameEditorEl.focus()}>Click to Edit!</button
				>
				<InlineTextEditor
					bind:this={displayNameEditorEl}
					bind:content={editingState.page.display_name as string}
				/>
			{/if}
		</h1>

		<div class="text-center">
			By <a href={`/${$page.params.username}`} class="text-blue-300 underline underline-offset-4">
				{data.profile.display_name}
			</a>
		</div>

		{#if editingState.editing}
			<label class="flex flex-row items-center gap-2">
				<span class="basis-40">Page Slug</span>
				<input class="input basis-auto" placeholder="slug" bind:value={editingState.page.slug} />
			</label>
		{/if}

		<!-- {#if form?.error}
			<aside class="alert variant-ghost-error my-2 w-full">
				<div class="alert-message">
					<p>Error updating profile: {form.error}</p>
				</div>
			</aside>
		{/if} -->

		<hr />

		{#if editingState.editing}
			<form method="post" class=" absolute left-8 top-8">
				<button class="variant-ghost-error btn-icon" title="Delete" name="delete">
					<Icon icon="proicons:delete" />
				</button>
			</form>
		{/if}

		<div class="absolute right-8 top-8 z-10 flex gap-2">
			{#if data.profileMatchesUserSession}
				{#if !editingState.editing}
					<button
						class="variant-ghost btn-icon absolute right-0 top-0"
						in:fadeIn={{ key: 'edit-buttons' }}
						out:fadeOut={{ key: 'edit-buttons' }}
						title="Edit"
						onclick={startEdit}
					>
						<Icon icon="raphael:edit" />
					</button>
				{:else}
					<form
						method="post"
						class="absolute right-0 top-0 flex flex-col gap-4"
						in:fadeIn={{ key: 'edit-buttons' }}
						out:fadeOut={{ key: 'edit-buttons' }}
					>
						<input type="hidden" name="data" value={formData.value} />

						<div class="flex flex-row gap-2">
							<button class="variant-ghost-success btn-icon" title="Save">
								<Icon icon="raphael:check" />
							</button>
							<button class="variant-ghost-error btn-icon" title="Cancel" onclick={cancelEdit}>
								<Icon icon="proicons:cancel" />
							</button>
						</div>
					</form>
				{/if}
			{/if}
		</div>

		<div class="flex flex-col gap-8">
			<div class="prose relative mx-auto w-full max-w-2xl px-4 pt-4 dark:prose-invert">
				{#if !editingState.editing}
					{@html renderMarkdownSanitized(data.page.markdown)}
				{:else}
					<CompositeMarkdownEditor bind:content={editingState.page.markdown} />
				{/if}
			</div>
			{#if data.page.links.length > 0 || editingState.editing}
				<div>
					<h2 class="mb-3 text-center text-2xl font-bold">Links</h2>
					{#if !editingState.editing}
						<ul class="flex flex-col items-center gap-2">
							{#each data.page.links as link}
								<li>
									<a class="variant-ghost btn" href={link.url}>
										{link.label || link.url}
									</a>
								</li>
							{/each}
						</ul>
					{:else}
						<LinksEditor bind:links={editingState.page.links} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
</main>
