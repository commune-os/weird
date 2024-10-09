import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const { user, token } = params;
	let csrfToken: string | undefined;
	try {
		const initResp = await fetch(`/auth/v1/users/${user}/reset/${token}`, {});
		const initContent = await initResp.text();
		const csrfFind = 'name="rauthy-csrf-token" id="';
		let contentSplit = initContent.split(csrfFind)[1];
		csrfToken = contentSplit.split('"')[0];
	} catch (e) {
		console.error('error loading reset page', e);
	}

	return { csrfToken, user, token };
};
