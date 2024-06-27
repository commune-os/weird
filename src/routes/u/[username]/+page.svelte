<script lang="ts">
	import { env } from '$env/dynamic/public';
	import Avatar from '$lib/components/Avatar.svelte';
	import type { WorkCapacity, WorkCompensation } from '../../auth/v1/account/proxy+page.server';
	import type { PageData } from './$types';
	const { data }: { data: PageData } = $props();
	const profile = data.profile;

	const printWorkCapacity = (c: WorkCapacity): string => {
		if (c == 'full_time') {
			return 'Full Time';
		} else if (c == 'part_time') {
			return 'Part Time';
		} else {
			return 'Not Specified';
		}
	};
	const printWorkCompensation = (c: WorkCompensation): string => {
		if (c == 'paid') {
			return 'Paid';
		} else if (c == 'volunteer') {
			return 'Volunteer';
		} else {
			return 'Not Specified';
		}
	};
</script>

<svelte:head>
	<title>
		{!('error' in profile) ? profile.display_name || profile.username : 'Profile'} | {env.PUBLIC_INSTANCE_NAME}
	</title>
</svelte:head>

{#if !('error' in profile)}
	<main class="flex flex-col items-center">
		<div class="card mt-12 flex w-[600px] max-w-[90%] flex-col gap-4 p-8 text-xl">
			<div class="flex items-center gap-4">
				<Avatar seed={profile.avatar_seed || profile.username || ''} />
				<h1 class="my-3 text-4xl">{profile.display_name || profile.username}</h1>
			</div>

			<hr class="mb-4" />

			<div class="flex flex-col gap-4">
				{#if profile.bio}
					<div>
						<pre
							class="mt-2 text-wrap rounded-lg bg-surface-300 p-3 font-sans text-base dark:bg-surface-900">{profile.bio}</pre>
					</div>
				{/if}
				{#if profile.links}
					{#each profile.links as link}
						<a class="variant-ghost btn" href={link.url}>
							{link.label || link.url}
						</a>
					{/each}
				{/if}
				{#if profile.tags && profile.tags.length > 0}
					<div class="flex items-center gap-2">
						<strong>Tags: </strong>
						<span class="flex flex-wrap gap-2 text-base">
							{#each profile.tags as tag}
								<a
									class="text-surface-900-50-token btn rounded-md bg-surface-200 p-1 hover:bg-surface-400 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-700"
									href={`/members?q=${tag}`}
								>
									{tag}
								</a>
							{/each}
						</span>
					</div>
				{/if}
				{#if profile.location}
					<div>
						<strong>Location: </strong>
						{profile.location}
					</div>
				{/if}
				{#if profile.contact_info}
					<div>
						<strong>Contact Info: </strong>
						{profile.contact_info}
					</div>
				{/if}
				{#if profile.work_capacity}
					<div>
						<strong>Work Capacity: </strong>
						{printWorkCapacity(profile.work_capacity)}
					</div>
				{/if}
				{#if profile.work_compensation}
					<div>
						<strong>Work Compensation: </strong>
						{printWorkCompensation(profile.work_compensation)}
					</div>
				{/if}
			</div>
		</div>
	</main>
{:else}
	<main class="flex flex-col items-center">
		<aside class="alert variant-ghost-error mt-8 w-80">
			<div class="alert-message">
				<p>Error loading user: {profile.error}</p>
			</div>
		</aside>
	</main>
{/if}
