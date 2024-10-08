import type { Actions, PageServerLoad } from './$types';
import { WebLinks, appendSubpath, profileLinkById, profileLinkByUsername } from '$lib/leaf/profile';
import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { parseUsername } from '$lib/utils/username';
import { leafClient } from '$lib/leaf';
import { CommonMark, Name } from 'leaf-proto/components';
import { Page } from '../types';
import { getSession } from '$lib/rauthy/server';
import { ensureUsernameMatchesSessionUserId } from '../utils';

export const load: PageServerLoad = async ({ params }): Promise<{ page: Page }> => {
	const username = parseUsername(params.username);
	if (username.domain == env.PUBLIC_DOMAIN) {
		return redirect(302, `/${username.name}/${params.slug}`);
	}
	const fullUsername = `${username.name}@${username.domain || env.PUBLIC_DOMAIN}`;
	const profileLink = await profileLinkByUsername(fullUsername);

	if (!profileLink) return error(404, `User not found: ${fullUsername}`);
	const pageLink = appendSubpath(profileLink, params.slug);

	const ent = await leafClient.get_components(pageLink, CommonMark, WebLinks, Name);
	if (!ent) return error(404, 'Page not found');

	let display_name = ent.get(Name)?.value;
	let links = ent.get(WebLinks)?.value;

	const commonMark = ent.get(CommonMark)?.value;

	if (!display_name) {
		display_name = env.PUBLIC_INSTANCE_NAME;
	}

	return {
		page: {
			slug: params.slug,
			display_name,
			markdown: commonMark || '',
			links: links || []
		}
	};
};

export const actions = {
	default: async ({ request, params, url, fetch }) => {
		const { sessionInfo } = await getSession(fetch, request);
		if (!sessionInfo) return redirect(302, `/login?to=${url}`);
		const resp = await ensureUsernameMatchesSessionUserId(params.username!, sessionInfo.user_id);
		if (resp) return resp;

		const profileLink = profileLinkById(sessionInfo.user_id);
		const oldPageLink = appendSubpath(profileLink, params.slug);

		const formData = await request.formData();
		if (formData.get('delete') != undefined) {
			leafClient.del_entity(oldPageLink);
			return redirect(302, `/${params.username}`);
		}

		let data: Page;
		try {
			const parsedData = JSON.parse(formData.get('data')?.toString() || '');
			if (!parsedData) return error(400, 'Missing data field');
			data = Page.parse(parsedData);
		} catch (e) {
			return error(400, `Error parsing form data: ${e}`);
		}

		const pageLink = appendSubpath(profileLink, data.slug);

		if (data.slug != params.slug) {
			await leafClient.del_entity(oldPageLink);
		}

		await leafClient.updateComponents(pageLink, [
			new Name(data.display_name),
			data.markdown.length > 0 ? new CommonMark(data.markdown) : CommonMark,
			data.links.length > 0 ? new WebLinks(data.links) : WebLinks
		]);

		redirect(302, `/${params.username}/${data.slug}`);
	}
} satisfies Actions;
