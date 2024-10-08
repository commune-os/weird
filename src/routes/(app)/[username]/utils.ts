import { profileLinkByUsername } from '$lib/leaf/profile';
import { fullyQualifiedUsername } from '$lib/utils/username';
import { error } from '@sveltejs/kit';

export async function ensureUsernameMatchesSessionUserId(
	username: string,
	userId: string
): Promise<Response | undefined> {
	let fullUsername = fullyQualifiedUsername(username).toString();
	const profileLink = await profileLinkByUsername(fullUsername);
	if (!profileLink) return error(404, `User not found: ${fullUsername}`);

	// Make sure the user can only modify their own settings
	const last = profileLink.path[profileLink.path.length - 1];
	if (!('String' in last && last.String == userId)) return error(403, 'Unauthorized');
}
