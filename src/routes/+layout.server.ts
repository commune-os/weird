import { env } from '$env/dynamic/public';
import { checkResponse } from '$lib/utils';
import type { LayoutServerLoad } from './$types';
import type { SessionInfo, UserInfo } from '$lib/rauthy';

// TODO: Move this logic to a "SessionProvider" component.
export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
	let sessionInfo: SessionInfo | undefined = undefined;
	let userInfo: UserInfo | undefined = undefined;

	const rauthySession = cookies.get(`${env.PUBLIC_COOKIE_PREFIX}RauthySession`);
	const rauthyUser = cookies.get(`${env.PUBLIC_COOKIE_PREFIX}RauthyUser`);

	try {
		const sessionInfoResp = await fetch('/auth/v1/oidc/sessioninfo', {
			headers: [['Cookie', `${env.PUBLIC_COOKIE_PREFIX}RauthySession=${rauthySession};${env.PUBLIC_COOKIE_PREFIX}RauthyUser=${rauthyUser}`]]
		});
		await checkResponse(sessionInfoResp);
		sessionInfo = await sessionInfoResp.json();

		const userInfoResp = await fetch(`/auth/v1/users/${sessionInfo?.user_id}`, {
			headers: [['Cookie', `${env.PUBLIC_COOKIE_PREFIX}RauthySession=${rauthySession};${env.PUBLIC_COOKIE_PREFIX}RauthyUser=${rauthyUser}`]]
		});
		await checkResponse(userInfoResp);
		userInfo = await userInfoResp.json();
	} catch (_) {}

	return { sessionInfo, userInfo };
};
