import { setProfileById, setAvatarById, type Profile } from '$lib/leaf/profile';
import { type Actions, redirect, fail } from '@sveltejs/kit';
import { type CheckResponseError } from '$lib/utils/http';
import { getSession } from '$lib/rauthy/server';
import { RawImage } from 'leaf-proto/components';
import sharp from 'sharp';
import { env } from '$env/dynamic/public';

export const actions = {
	default: async ({ fetch, request }) => {
		let { sessionInfo } = await getSession(fetch, request);
		if (!sessionInfo) return fail(403, { error: 'Not logged in' });

		const data = await request.formData();

		let username = data.get('username')?.toString() || undefined;
		if (username === '') {
			username = undefined;
		} else if (username) {
			if (!username?.includes('@')) username = `${username}@${env.PUBLIC_DOMAIN}`;
		}
		let display_name = data.get('display_name')?.toString() || undefined;
		if (display_name === '') {
			display_name = undefined;
		}
		let tagsInput = data.get('tags');
		let tags: string[] = [];
		if (tagsInput) {
			const trimmedInput = tagsInput.toString().trim();
			tags = trimmedInput
				.split(',')
				.map((x) => x.trim())
				.filter((x) => x.length > 0);
		}
		let links: { label?: string; url: string }[] = JSON.parse(
			data.get('links')?.toString() || '{}'
		);
		let bio = data.get('bio')?.toString() || undefined;
		if (bio === '') {
			bio = undefined;
		}
		let mastodon_server = data.get('mastodon_server');
		if (mastodon_server == '') {
			mastodon_server = null;
		}
		let mastodon_username = data.get('mastodon_username');
		if (mastodon_username == '') {
			mastodon_username = null;
		}
		const mastodon_profile =
			(mastodon_server &&
				mastodon_username && {
					server: mastodon_server.toString(),
					username: mastodon_username.toString()
				}) ||
			undefined;

		let pubpage_theme = data.get('subsite_theme')?.toString() || undefined;
		if (pubpage_theme === '') {
			pubpage_theme = undefined;
		}

		const profile: Profile = {
			username,
			display_name,
			tags,
			links,
			bio,
			mastodon_profile,
			pubpage_theme
		};

		try {
			const avatarData = data.get('avatar') as File;
			if (avatarData.name != '') {
				const origData = new Uint8Array(await avatarData.arrayBuffer());
				const resized = new Uint8Array(
					(await sharp(origData).resize(256, 256).webp().toBuffer()).buffer
				);
				await setAvatarById(sessionInfo.user_id, new RawImage('image/webp', resized));
			}
		} catch (e) {
			console.error('Error updating profile:', e);
			const data = JSON.parse((e as CheckResponseError).data);
			return fail(400, { error: `Error updating profile avatar: ${data.error}` });
		}

		try {
			await setProfileById(sessionInfo.user_id, profile);
		} catch (e) {
			console.error('Error updating profile:', e);
			return fail(400, { error: `Error updating profile: ${e}` });
		}

		redirect(303, '/my-profile');
	}
} satisfies Actions;
