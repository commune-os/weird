import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSession } from '$lib/rauthy/server';
import { ensureUsernameMatchesSessionUserId } from '../../utils';
import { createChallenge } from '$lib/dns-challenge';
import { getProfileById, setCustomDomain } from '$lib/leaf/profile';

export const load: PageServerLoad = async ({ fetch, params, request, url }) => {
	const { sessionInfo } = await getSession(fetch, request);
	if (!sessionInfo) return redirect(302, `/login?to=${url}`);
	const resp = await ensureUsernameMatchesSessionUserId(params.username!, sessionInfo.user_id);
	if (resp) return resp;

	const profile = await getProfileById(sessionInfo.user_id);
	const dnsChallenge = await createChallenge(sessionInfo.user_id);

	return { dnsChallenge, profile, userId: sessionInfo.user_id };
};

export const actions = {
	default: async ({ request, fetch }) => {
		try {
			let { sessionInfo } = await getSession(fetch, request);
			if (!sessionInfo) {
				throw 'User not logged in';
			}
			const formData = await request.formData();
			const customDomain = formData.get('custom_domain');
			let resp;

			if (customDomain && customDomain != '') {
				const dnsChallenge = await createChallenge(sessionInfo.user_id);
				try {
					resp = await fetch(
						`http://${customDomain}/__internal__/dns-challenge/${dnsChallenge}/${sessionInfo?.user_id}`
					);
				} catch (_) {}
				if (resp?.status != 200) {
					throw 'Error validating DNS challenge';
				}

				await setCustomDomain(sessionInfo.user_id, customDomain.toString());
			} else {
				await setCustomDomain(sessionInfo.user_id, undefined);
			}
		} catch (e) {
			return fail(400, { error: `Error updating domain: ${e}` });
		}
	}
} satisfies Actions;
