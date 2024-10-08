import { env } from '$env/dynamic/private';
import { BSKY_ERR_REDIRECT_PATH } from '$lib/constants.js';
import { agent } from '$lib/utils/bsky.js';
import { redirect } from '@sveltejs/kit';

export async function load(event) {
	const username = event.url.searchParams.get('username') as string;
	if (!username) {
		throw redirect(302, BSKY_ERR_REDIRECT_PATH);
	}
	await agent.login({
		identifier: env.BSKY_IDENTIFIER,
		password: env.BSKY_PSWD
	});
	try {
		const userResp = await agent.getProfile({ actor: username });
		return {
			user: userResp.data
		};
	} catch (err) {
		throw redirect(302, BSKY_ERR_REDIRECT_PATH);
	}
}
