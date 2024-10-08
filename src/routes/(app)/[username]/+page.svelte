<script lang="ts">
	import type { SvelteComponent } from 'svelte';
	import { env } from '$env/dynamic/public';
	import Avatar from '$lib/components/avatar/view.svelte';
	import { onNavigate } from '$app/navigation';
	import { getModalStore, getToastStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import InlineTextEditor from '$lib/components/editors/InlineTextEditor.svelte';
	import type { Profile } from '$lib/leaf/profile';
	import { renderMarkdownSanitized } from '$lib/utils/markdown';
	import type { ActionData, PageData } from './$types';
	import CompositeMarkdownEditor from '$lib/components/editors/CompositeMarkdownEditor.svelte';
	import LinksEditor from '$lib/components/editors/LinksEditor.svelte';
	import { checkResponse } from '$lib/utils/http';
	import Icon from '@iconify/svelte';
	import { quintOut } from 'svelte/easing';
	import { crossfade } from 'svelte/transition';

	import { page } from '$app/stores';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	const githubImportModal: ModalSettings = {
		type: 'prompt',
		// Data
		title: 'Enter Github Username',
		body: 'Provide your github username to fetch README.md',
		// Populates the input value and attributes
		value: '',
		valueAttr: { type: 'text', required: true },
		// Returns the updated response value
		response: async (r: string) => {
			if (r && r.trim().length) {
				const repoResp = await fetch(`https://raw.githubusercontent.com/${r}/${r}/HEAD/README.md`);
				try {
					await checkResponse(repoResp);
					editingState.profile.bio = await repoResp.text();
				} catch (e) {
					toastStore.trigger({
						message: 'Github profile not exists',
						hideDismiss: true,
						timeout: 3000,
						background: 'variant-filled-error'
					});
					console.error('Error fetching GitHub README', e);
				}
			}
		}
	};

	let editingState: { editing: boolean; profile: Profile } = $state({
		editing: false,
		profile: { tags: [], links: [] }
	});

	// Prepare editing state, if this is the logged in user's profile page.
	if (data.profileMatchesUserSession) {
		editingState.profile = data.profile;
	}

	// Here we have to hack a unique ID in for each of the links so that it can be used by the
	// LinksEditor component.
	//
	// It'd be good to find a better way to do this.
	$effect(() => {
		for (const link of editingState.profile.links) {
			if (!(link as any).id) (link as any).id = Math.random().toString();
		}
	});

	let profile = $derived(data.profile as Profile);
	let pubpageHost = $derived(
		data.profile.custom_domain ||
			`${data.profile.username?.split('@')[0]}.${env.PUBLIC_USER_DOMAIN_PARENT}`
	);
	let pubpageUrl = $derived(`${new URL(env.PUBLIC_URL).protocol}//${pubpageHost}`);

	let editingTagsState = $state('');
	let editingTagsProxy = $state({
		get value() {
			return editingTagsState;
		},
		set value(value: string) {
			editingTagsState = value;
			editingState.profile.tags = value
				.split(',')
				.map((x) => x.trim())
				.filter((x) => !!x);
		}
	});

	let editingUsernameProxy = $state({
		get value() {
			return editingState.profile.username?.split('@')[0];
		},
		set value(value) {
			editingState.profile.username = `${value}@${env.PUBLIC_DOMAIN}`;
		}
	});
	const editingLinksProxy = {
		get value() {
			return JSON.stringify(editingState.profile.links);
		}
	};

	let avatarSrcOverride = $state(undefined) as string | undefined;

	function handleAvatarChange(
		e: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) {
		var reader = new FileReader();
		reader.onload = function () {
			// Preview Image
			avatarSrcOverride = reader.result as string;
		};
		// Read Selected Image as DataURL
		reader.readAsDataURL(e.currentTarget!.files![0]);
	}

	function startEdit() {
		if (data.profileMatchesUserSession) {
			editingState.profile = data.profile;
			editingState.editing = true;
			editingTagsState = data.profile.tags.join(', ');
		}
	}

	function cancelEdit(e?: Event) {
		if (e) e.preventDefault();
		editingState.editing = false;
		editingState.profile = data.profile;
		avatarSrcOverride = undefined;
	}

	onNavigate(() => cancelEdit());

	const [fadeOut, fadeIn] = crossfade({
		duration: 500,
		easing: quintOut
	});

	// svelte-ignore non_reactive_update
	let displayNameEditorEl: SvelteComponent;
	// svelte-ignore non_reactive_update
	let avatarInputEl: HTMLInputElement;
</script>

<svelte:head>
	<title>
		{profile.display_name || profile.username} |
		{env.PUBLIC_INSTANCE_NAME}
	</title>
</svelte:head>

<main class="mx-4 flex w-full flex-col items-center">
	<div class="card m-4 mt-12 flex w-full max-w-[700px] flex-col gap-4 p-8 text-xl">
		<div class="relative flex items-center gap-4">
			{#if !editingState.editing}
				<Avatar username={profile.username} />
			{:else}
				<figure class="relative">
					<Avatar username={profile.username} src={avatarSrcOverride} />
					<figcaption
						class="absolute left-0 top-0 h-full w-full rounded-full bg-black/75 bg-opacity-50 opacity-0 hover:opacity-100"
					>
						<button
							title="Change avatar"
							class="h-full w-full"
							onclick={() => avatarInputEl.click()}
						>
							<Icon icon="ph:camera-light" font-size="3.5em" class="m-auto" />
						</button>
					</figcaption>
				</figure>
			{/if}
			<div class="flex flex-col">
				<h1 class="relative my-3 grid text-4xl">
					{#if !editingState.editing}
						<div style="grid-area: 1 / 1;">
							{profile.display_name || profile.username}
						</div>
					{:else}
						<div style="grid-area: 1 / 1;">
							<button
								class="variant-filled badge absolute right-[-4em] top-[-2em] z-10"
								onclick={() => displayNameEditorEl.focus()}>Click to Edit!</button
							>
							<InlineTextEditor
								bind:this={displayNameEditorEl}
								bind:content={editingState.profile.display_name as string}
							/>
						</div>
					{/if}
				</h1>
				<a
					class="text-center text-sm text-surface-100 underline decoration-1 underline-offset-4"
					href={pubpageUrl}>{pubpageHost}</a
				>
				{#if form?.error}
					<aside class="alert variant-ghost-error my-2 w-full">
						<div class="alert-message">
							<p>Error updating profile: {form.error}</p>
						</div>
					</aside>
				{/if}
			</div>

			<div class="absolute right-0 top-0 flex gap-2">
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
							enctype="multipart/form-data"
						>
							<input
								name="username"
								type="hidden"
								class="input"
								bind:value={editingUsernameProxy.value}
							/>
							<input type="hidden" name="display_name" value={editingState.profile.display_name} />
							<input
								name="avatar"
								type="file"
								class="hidden"
								accept=".jpg, .jpeg, .png, .webp, .gif"
								bind:this={avatarInputEl}
								onchange={handleAvatarChange}
							/>
							<input type="hidden" name="bio" value={editingState.profile.bio} />
							<input type="hidden" name="tags" value={editingState.profile.tags} />
							<input type="hidden" name="links" value={editingLinksProxy.value} />

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
		</div>

		<hr class="mb-4" />

		<div class="flex flex-col gap-8">
			<div class="prose relative mx-auto w-full max-w-2xl px-4 pt-4 dark:prose-invert">
				{#if !editingState.editing}
					{@html renderMarkdownSanitized(profile.bio || '')}
				{:else}
					<CompositeMarkdownEditor
						maxLength={512}
						bind:content={editingState.profile.bio as string}
					/>
				{/if}
			</div>
			{#if profile.links.length > 0 || editingState.editing}
				<div>
					<h2 class="mb-3 text-center text-2xl font-bold">Links</h2>
					{#if !editingState.editing}
						<ul class="flex flex-col items-center gap-2">
							{#each profile.links as link}
								<li>
									<a class="variant-ghost btn" href={link.url}>
										{link.label || link.url}
									</a>
								</li>
							{/each}
						</ul>
					{:else}
						<LinksEditor bind:links={editingState.profile.links} />
					{/if}
				</div>
			{/if}
			{#if data.pages.length > 0}
				<div>
					<h2 class="mb-3 text-center text-2xl font-bold">Pages</h2>
					<ul class="flex flex-col items-center gap-2">
						{#each data.pages as p}
							<li>
								<a class="variant-ghost btn" href={`/${$page.params.username}/${p.slug}`}>
									{p.name || p.slug}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if profile.tags.length > 0 || editingState.editing}
				<div class="mt-4 flex flex-wrap items-baseline gap-2">
					<strong>Tags: </strong>
					{#if editingState.editing}
						<span class="text-sm"> Separate multiple tags with commas.</span>
						<div class="basis-full">
							<input class="input" bind:value={editingTagsProxy.value} />
						</div>
					{/if}
					<span class="flex flex-wrap gap-2 text-base">
						{#each editingState.editing ? editingState.profile.tags : profile.tags as tag}
							<a
								class="text-surface-900-50-token btn rounded-md bg-surface-200 p-1 hover:bg-surface-400 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700"
								href={`/people?q=${tag}`}
							>
								{tag}
							</a>
						{/each}
					</span>
				</div>
			{/if}
		</div>
	</div>
</main>
