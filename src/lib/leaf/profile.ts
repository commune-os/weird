import { BorshSchema, Component, type ExactLink, type PathSegment } from 'leaf-proto';
import { CommonMark, Description, RawImage, Name } from 'leaf-proto/components';
import { instance_link, leafClient } from '.';
import { env } from '$env/dynamic/public';

export const PROFILE_PREFIX: PathSegment = { String: 'profiles' };

/** A "complete" profile loaded from multiple components. */
export interface Profile {
	username?: string;
	custom_domain?: string;
	display_name?: string;
	tags: string[];
	bio?: string;
	links: { label?: string; url: string }[];
	mastodon_profile?: {
		username: string;
		server: string;
	};
	pubpage_theme?: string;
}

export class Username extends Component {
	value: string = '';
	constructor(s: string) {
		super();
		this.value = s;
	}
	static componentName(): string {
		return 'Username';
	}
	static borshSchema(): BorshSchema {
		return BorshSchema.String;
	}
	static specification(): Component[] {
		return [new CommonMark('The username of the user represented by this entity.')];
	}
}

export class Tags extends Component {
	value: string[] = [];
	constructor(tags: string[]) {
		super();
		this.value = tags;
	}
	static componentName(): string {
		return 'Tags';
	}
	static borshSchema(): BorshSchema {
		return BorshSchema.Vec(BorshSchema.String);
	}
	static specification(): Component[] {
		return [
			new CommonMark(`A list of string tags associated to the entity.

There is no restriction on the format of the tag. Any valid UTF-8 is accepted.

An example use would be hashtags or some equivalent.`)
		];
	}
}

export class WebLink {
	label?: string;
	url: string;
	constructor(url: string, label?: string) {
		this.label = label;
		this.url = url;
	}
}
export const WebLinkSchema = BorshSchema.Struct({
	label: BorshSchema.Option(BorshSchema.String),
	url: BorshSchema.String
});

export class WebLinks extends Component {
	value: WebLink[];
	constructor(links: WebLink[]) {
		super();
		this.value = links;
	}
	static componentName(): string {
		return 'WebLinks';
	}
	static borshSchema(): BorshSchema {
		return BorshSchema.Vec(WebLinkSchema);
	}
	static specification(): Component[] {
		return [
			new CommonMark(`A list of web links associated to the entity.

Each link has an optional label and a URL, which must be a valid URL`)
		];
	}
}

export class MastodonProfile extends Component {
	value: {
		username: string;
		server: string;
	};
	constructor(profile: { username: string; server: string }) {
		super();
		this.value = profile;
	}
	static componentName(): string {
		return 'MastodonProfile';
	}
	static borshSchema(): BorshSchema {
		return BorshSchema.Struct({
			username: BorshSchema.String,
			server: BorshSchema.String
		});
	}
	static specification(): Component[] {
		return [
			new CommonMark(
				`The username and server URL of the mastodon profile associated to this entity.`
			)
		];
	}
}

export class WeirdPubpageTheme extends Component {
	value: string = '';
	constructor(s: string) {
		super();
		this.value = s;
	}
	static componentName(): string {
		return 'WeirdPubpageTheme';
	}
	static borshSchema(): BorshSchema {
		return BorshSchema.String;
	}
	static specification(): Component[] {
		return [
			new CommonMark(`The name of the theme selected by a user for their main Weird pubpage.`)
		];
	}
}

export class WeirdCustomDomain extends Component {
	value: string;
	constructor(s: string) {
		super();
		this.value = s;
	}
	static componentName(): string {
		return 'WeirdCustomDomain';
	}
	static borshSchema(): BorshSchema {
		return BorshSchema.String;
	}
	static specification(): Component[] {
		return [new CommonMark(`An optional custom domain for the user's pubpage.`)];
	}
}

export function profileLinkById(rauthyId: string): ExactLink {
	return instance_link([PROFILE_PREFIX, { String: rauthyId }]);
}
export async function profileLinkByUsername(username: string): Promise<ExactLink | undefined> {
	if (!username.endsWith(`@${env.PUBLIC_DOMAIN}`)) throw 'Federation not supported yet';

	const profilesLink = instance_link([PROFILE_PREFIX]);
	const entities = await leafClient.list_entities(profilesLink);
	for (const link of entities) {
		const ent = await leafClient.get_components(link, [Username]);
		if (ent) {
			const u = ent.get(Username);
			if (u && u.value == username) {
				return link;
			}
		}
	}

	return undefined;
}

export async function getProfile(link: ExactLink): Promise<Profile | undefined> {
	let ent = await leafClient.get_components(link, [
		Name,
		Description,
		Username,
		Tags,
		WeirdCustomDomain,
		MastodonProfile,
		WeirdPubpageTheme,
		WebLinks
	]);
	return (
		(ent && {
			username: ent.get(Username)?.value,
			display_name: ent.get(Name)?.value,
			bio: ent.get(Description)?.value,
			tags: ent.get(Tags)?.value || [],
			custom_domain: ent.get(WeirdCustomDomain)?.value,
			links: ent.get(WebLinks)?.value || [],
			mastodon_profile: ent.get(MastodonProfile)?.value,
			pubpage_theme: ent.get(WeirdPubpageTheme)?.value
		}) ||
		undefined
	);
}
export async function setProfile(link: ExactLink, profile: Profile) {
	const delComponents = [];
	const add_components = [];

	profile.display_name
		? add_components.push(new Name(profile.display_name))
		: delComponents.push(Name);
	profile.bio ? add_components.push(new Description(profile.bio)) : delComponents.push(Description);
	profile.username
		? add_components.push(new Username(profile.username))
		: delComponents.push(Username);
	profile.custom_domain
		? add_components.push(new WeirdCustomDomain(profile.custom_domain))
		: delComponents.push(WeirdCustomDomain);
	profile.mastodon_profile
		? add_components.push(new MastodonProfile(profile.mastodon_profile))
		: delComponents.push(MastodonProfile);
	profile.pubpage_theme
		? add_components.push(new WeirdPubpageTheme(profile.pubpage_theme))
		: delComponents.push(WeirdPubpageTheme);
	add_components.push(new WebLinks(profile.links));
	add_components.push(new Tags(profile.tags));

	// TODO: allow deleting and adding components in the same RPC request.
	if (delComponents.length > 0) await leafClient.del_components(link, delComponents);
	await leafClient.add_components(link, add_components);
}

export async function setCustomDomain(userId: string, domain?: string): Promise<void> {
	const link = profileLinkById(userId);
	if (domain) {
		await leafClient.add_components(link, [new WeirdCustomDomain(domain)]);
	} else {
		await leafClient.del_components(link, [WeirdCustomDomain]);
	}
}
export async function setAvatar(link: ExactLink, avatar: RawImage): Promise<void> {
	await leafClient.add_components(link, [avatar]);
}
export async function getAvatar(link: ExactLink): Promise<RawImage | undefined> {
	const ent = await leafClient.get_components(link, [RawImage]);
	return ent?.get(RawImage);
}

export async function getAvatarById(rauthyId: string): Promise<RawImage | undefined> {
	return await getAvatar(profileLinkById(rauthyId));
}
export async function setAvatarById(rauthyId: string, avatar: RawImage): Promise<void> {
	return await setAvatar(profileLinkById(rauthyId), avatar);
}
export async function getAvatarByUsername(username: string): Promise<RawImage | undefined> {
	const link = await profileLinkByUsername(username);
	if (!link) return;
	return await getAvatar(link);
}

export async function getProfileById(rauthyId: string): Promise<Profile | undefined> {
	return await getProfile(profileLinkById(rauthyId));
}
export async function getProfileByUsername(username: string): Promise<Profile | undefined> {
	const link = await profileLinkByUsername(username);
	if (!link) return;
	return await getProfile(link);
}
export async function setProfileById(rauthyId: string, profile: Profile): Promise<void> {
	await setProfile(profileLinkById(rauthyId), profile);
}

export async function getProfiles(): Promise<Profile[]> {
	const profilesLink = instance_link([PROFILE_PREFIX]);
	const entities = await leafClient.list_entities(profilesLink);
	const profiles: Profile[] = [];

	for (const link of entities) {
		const profile = await getProfile(link);
		if (!profile) continue;
		profiles.push(profile);
	}
	return profiles;
}
