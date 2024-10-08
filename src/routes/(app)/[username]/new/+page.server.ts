import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSession } from '$lib/rauthy/server';
import { ensureUsernameMatchesSessionUserId } from '../utils';
import { WebLinks, appendSubpath, getProfileById, profileLinkById } from '$lib/leaf/profile';
import { Page } from '../types';
import { leafClient } from '$lib/leaf';
import { CommonMark, Name } from 'leaf-proto/components';

export const load: PageServerLoad = async ({ fetch, params, request, url }) => {
	const { sessionInfo } = await getSession(fetch, request);
	if (!sessionInfo) return redirect(302, `/login?to=${url}`);
	const resp = await ensureUsernameMatchesSessionUserId(params.username!, sessionInfo.user_id);
	if (resp) return resp;

	const profile = await getProfileById(sessionInfo.user_id);

	return { profile, userId: sessionInfo.user_id };
};

export const actions = {
	default: async ({ request, params, url, fetch }) => {
		const { sessionInfo } = await getSession(fetch, request);
		if (!sessionInfo) return redirect(302, `/login?to=${url}`);
		const resp = await ensureUsernameMatchesSessionUserId(params.username!, sessionInfo.user_id);
		if (resp) return resp;

		let data: Page;
		try {
			const formData = JSON.parse((await request.formData()).get('data')?.toString() || '');
			if (!formData) return error(400, 'Missing data field');
			data = Page.parse(formData);
		} catch (e) {
			return error(400, `Error parsing form data: ${e}`);
		}

		const profileLink = profileLinkById(sessionInfo.user_id);
		const pageLink = appendSubpath(profileLink, data.slug);

		const ent = await leafClient.get_components(pageLink);
		if (ent) return fail(400, { error: 'Page with that slug already exists.', data });

		await leafClient.updateComponents(pageLink, [
			new Name(data.display_name),
			data.markdown.length > 0 ? new CommonMark(data.markdown) : CommonMark,
			data.links.length > 0 ? new WebLinks(data.links) : WebLinks
		]);

		return redirect(302, `/${params.username}/${data.slug}`);
	}
} satisfies Actions;
