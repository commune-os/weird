import { BSKY_SERVICE } from '$lib/constants';
import { AtpAgent } from '@atproto/api';

export const agent = new AtpAgent({
	service: BSKY_SERVICE
});
