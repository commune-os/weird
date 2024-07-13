import type { PageServerLoad } from './$types';
import { backendFetch } from '$lib/backend';
import { getSession } from '$lib/rauthy/server';

export const load: PageServerLoad = async ({ fetch, request, url }): Promise<null> => {
	let { userInfo } = await getSession(fetch, request);

	if (userInfo) {
		backendFetch(fetch, `/token/${userInfo.id}/revoke`, {
			method: 'POST'
		});
	}

	return null;
};
