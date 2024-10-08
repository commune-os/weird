import { BorshSchema, borshSerialize, borshDeserialize, type Unit } from 'borsher';
import { blake3 } from '@noble/hashes/blake3';
export { BorshSchema, borshDeserialize, borshSerialize, type Unit };
import ReconnectingWebSocket from 'reconnecting-websocket';

import rawBase32encode from 'base32-encode';
import rawBase32decode from 'base32-decode';

export function base32Encode(
	data: ArrayBuffer | Int8Array | Uint8Array | Uint8ClampedArray
): string {
	return rawBase32encode(data, 'RFC3548', { padding: false }).toLowerCase();
}

export function base32Decode(string: string): Uint8Array {
	return new Uint8Array(rawBase32decode(string.toUpperCase(), 'RFC3548'));
}

export type Digest = Uint8Array;
export type NamespaceId = Digest;
export type NamespaceSecretKey = Digest;
export type SubspaceId = Digest;
export type SubspaceSecretKey = Digest;
export const DigestSchema = BorshSchema.Array(BorshSchema.u8, 32);
export const NamespaceIdSchema = DigestSchema;
export const NamespaceSecretKeySchema = NamespaceIdSchema;
export const SubspaceIdSchema = DigestSchema;
export const SubspaceSecretKeySchema = SubspaceIdSchema;

export type PathSegment =
	| { Null: Unit }
	| { Bool: boolean }
	| { Uint: number }
	| { Int: number }
	| { String: string }
	| { Bytes: number[] };
export const PathSegmentSchema = BorshSchema.Enum({
	Null: BorshSchema.Unit,
	Bool: BorshSchema.bool,
	Uint: BorshSchema.u64,
	Int: BorshSchema.i64,
	String: BorshSchema.String,
	Bytes: BorshSchema.Vec(BorshSchema.u8)
});

export type EntityPath = PathSegment[];
export const EntityPathSchema = BorshSchema.Vec(PathSegmentSchema);

export type ExactLink = {
	namespace: NamespaceId;
	subspace: SubspaceId;
	path: EntityPath;
};
export const ExactLinkSchema = BorshSchema.Struct({
	namespace: NamespaceIdSchema,
	subspace: SubspaceIdSchema,
	path: EntityPathSchema
});

export type ComponentData = {
	schema: Digest;
	data: Uint8Array;
};
export const ComponentDataSchema = BorshSchema.Struct({
	schema: DigestSchema,
	data: BorshSchema.Vec(BorshSchema.u8)
});

export type ComponentEntry = {
	schema_id?: Digest;
	component_id: Digest;
};
export const ComponentEntrySchema = BorshSchema.Struct({
	schema_id: BorshSchema.Option(DigestSchema),
	component_id: DigestSchema
});

export type Entity = ComponentEntry[];
export const EntitySchema = BorshSchema.Vec(ComponentEntrySchema);

export type ReqKind =
	| { Authenticate: string }
	| { ReadEntity: ExactLink }
	| { DelEntity: ExactLink }
	| { GetComponentsBySchema: { link: ExactLink; schemas: Digest[] } }
	| { DelComponentsBySchema: { link: ExactLink; schemas: Digest[] } }
	| { AddComponents: { link: ExactLink; components: ComponentData[]; replace_existing: boolean } }
	| { ListEntities: ExactLink }
	| { CreateNamespace: Unit }
	| { ImportNamespaceSecret: NamespaceId }
	| { GetNamespaceSecret: NamespaceSecretKey }
	| { CreateSubspace: Unit }
	| { ImportSubspaceSecret: SubspaceSecretKey }
	| { GetSubspaceSecret: SubspaceId }
	| { GetLocalSecret: string }
	| { SetLocalSecret: { key: string; value?: string } }
	| { ListLocalSecrets: Unit };
export const ReqKindSchema = BorshSchema.Enum({
	Authenticate: BorshSchema.String,
	ReadEntity: ExactLinkSchema,
	DelEntity: ExactLinkSchema,
	GetComponentsBySchema: BorshSchema.Struct({
		link: ExactLinkSchema,
		schemas: BorshSchema.Vec(DigestSchema)
	}),
	DelComponentsBySchema: BorshSchema.Struct({
		link: ExactLinkSchema,
		schemas: BorshSchema.Vec(DigestSchema)
	}),
	AddComponents: BorshSchema.Struct({
		link: ExactLinkSchema,
		components: BorshSchema.Vec(ComponentDataSchema),
		replace_existing: BorshSchema.bool
	}),
	ListEntities: ExactLinkSchema,
	CreateNamespace: BorshSchema.Unit,
	ImportNamespaceSecret: NamespaceSecretKeySchema,
	GetNamespaceSecret: NamespaceIdSchema,
	CreateSubspace: BorshSchema.Unit,
	ImportSubspaceSecret: SubspaceSecretKeySchema,
	GetSubspaceSecret: SubspaceIdSchema,
	GetLocalSecret: BorshSchema.String,
	SetLocalSecret: BorshSchema.Struct({
		key: BorshSchema.String,
		value: BorshSchema.Option(BorshSchema.String)
	}),
	ListLocalSecrets: BorshSchema.Unit
});

export type Req = {
	id: bigint;
	kind: ReqKind;
};
export const ReqSchema = BorshSchema.Struct({
	id: BorshSchema.u64,
	kind: ReqKindSchema
});

export type ComponentKind =
	| { Unencrypted: { component: ComponentData } }
	| {
			Encrypted: {
				algorithm: {
					name: string;
					specification: Digest;
				};
				key_id: Uint8Array;
				encrypted_data: Uint8Array;
			};
	  };
export const ComponentKindSchema = BorshSchema.Enum({
	Unencrypted: BorshSchema.Struct({
		component: ComponentDataSchema
	}),
	Encrypted: BorshSchema.Struct({
		algorithm: BorshSchema.Struct({
			name: BorshSchema.String,
			specification: DigestSchema
		}),
		key_id: BorshSchema.Array(BorshSchema.u8, 32),
		encrypted_data: BorshSchema.Vec(BorshSchema.u8)
	})
});

export type GetComponentsInner = {
	entity_digest: Digest;
	components: Map<Digest, Uint8Array[]>;
};
export const GetComponentsInnerSchema = BorshSchema.Struct({
	entity_digest: DigestSchema,
	components: BorshSchema.HashMap(DigestSchema, BorshSchema.Vec(BorshSchema.Vec(BorshSchema.u8)))
});

export type RespKind =
	| { Authenticated: Unit }
	| { ReadEntity: { digest: Digest; entity: Entity } | null }
	| { DelEntity: Unit }
	| { GetComponentsBySchema: GetComponentsInner | null }
	| { DelComponentsBySchema: Digest | null }
	| { AddComponents: Digest }
	| { ListEntities: ExactLink[] }
	| { CreateNamespace: NamespaceId }
	| { ImportNamespaceSecret: NamespaceId }
	| { GetNamespaceSecret: NamespaceSecretKey | null }
	| { CreateSubspace: SubspaceId }
	| { ImportSubspaceSecret: SubspaceId }
	| { GetSubspaceSecret: SubspaceSecretKey | null }
	| { GetLocalSecret: string | null }
	| { SetLocalSecret: Unit }
	| { ListLocalSecrets: { key: string; value: string }[] };
export const RespKindSchema = BorshSchema.Enum({
	Authenticated: BorshSchema.Unit,
	ReadEntity: BorshSchema.Option(
		BorshSchema.Struct({ digest: DigestSchema, entity: EntitySchema })
	),
	DelEntity: BorshSchema.Unit,
	GetComponentsBySchema: BorshSchema.Option(GetComponentsInnerSchema),
	DelComponentsBySchema: BorshSchema.Option(DigestSchema),
	AddComponents: DigestSchema,
	ListEntities: BorshSchema.Vec(ExactLinkSchema),
	CreateNamespace: NamespaceIdSchema,
	ImportNamespaceSecret: NamespaceIdSchema,
	GetNamespaceSecret: BorshSchema.Option(NamespaceSecretKeySchema),
	CreateSubspace: SubspaceIdSchema,
	ImportSubspaceSecret: SubspaceIdSchema,
	GetSubspaceSecret: BorshSchema.Option(SubspaceSecretKeySchema),
	GetLocalSecret: BorshSchema.Option(BorshSchema.String),
	SetLocalSecret: BorshSchema.Unit,
	ListLocalSecrets: BorshSchema.Vec(
		BorshSchema.Struct({ key: BorshSchema.String, value: BorshSchema.String })
	)
});

export type RespResult = { Err: string } | { Ok: RespKind };
export const RespResultSchema = BorshSchema.Enum({
	Err: BorshSchema.String,
	Ok: RespKindSchema
});

export type Resp = {
	id: bigint;
	result: RespResult;
};
export const RespSchema = BorshSchema.Struct({
	id: BorshSchema.u64,
	result: RespResultSchema
});

export type KeyResolverKind = { Inline: Uint8Array } | { Custom: { id: Digest; data: Uint8Array } };
export const KeyResolverKindSchema = BorshSchema.Enum({
	Inline: BorshSchema.Vec(BorshSchema.u8),
	Custom: BorshSchema.Struct({ id: DigestSchema, data: BorshSchema.Vec(BorshSchema.u8) })
});

export type Link = {
	namespace: KeyResolverKind;
	subspace: KeyResolverKind;
	path: EntityPath;
	snapshot?: Digest;
};
export const LinkSchema = BorshSchema.Struct({
	namespace: KeyResolverKindSchema,
	subspace: KeyResolverKindSchema,
	path: EntityPathSchema,
	snapshot: BorshSchema.Option(DigestSchema)
});

export type LeafBlob = Digest;
export const LeafBlobSchema = DigestSchema;

export type LeafBorshFormat = {
	Null: Unit;
	Bool: boolean;
	U8: number;
	U16: number;
	U32: number;
	U64: bigint;
	U128: bigint;
	I8: number;
	I16: number;
	I32: number;
	I64: bigint;
	I128: bigint;
	F32: number;
	F64: number;
	String: string;
	Option: {
		schema: LeafBorshFormat;
	};
	Array: {
		schema: LeafBorshFormat;
		len: number;
	};
	Struct: {
		fields: { name: string; schema: LeafBorshFormat }[];
	};
	Enum: {
		variants: { name: string; schema: LeafBorshFormat }[];
	};
	Vector: {
		schema: LeafBorshFormat;
	};
	Map: {
		key: LeafBorshFormat;
		value: LeafBorshFormat;
	};
	Set: {
		schema: LeafBorshFormat;
	};
	Blob: Unit;
	Snapshot: Unit;
	Link: Unit;
};

function entity_from_components<C extends Component>(components: Iterable<C>): Entity {
	const componentEntries: Entity = [];
	for (const component of components) {
		const schema_id = Object.getPrototypeOf(component).constructor.schemaId();
		const componentData = component.serialize();
		const componentKind = borshSerialize(ComponentKindSchema, {
			Unencrypted: {
				component: {
					schema: schema_id,
					data: componentData
				}
			}
		} as ComponentKind);
		const component_id = blake3(componentKind);
		componentEntries.push({
			schema_id,
			component_id
		});
	}
	return componentEntries;
}

function compute_entity_id(ent: Entity): Digest {
	ent.sort((a, b) => {
		let a_bytes = borshSerialize(ComponentEntrySchema, a);
		let b_bytes = borshSerialize(ComponentEntrySchema, b);
		console.assert(a_bytes.length == b_bytes.length);
		for (let i = 0; i < a_bytes.length; i++) {
			let ai = a_bytes[i];
			let bi = b_bytes[i];
			if (ai == bi) {
				continue;
			} else {
				return ai - bi;
			}
		}
		return 0;
	});
	const entityBuffer = borshSerialize(EntitySchema, ent);
	return blake3(entityBuffer);
}

export const SCHEMA_ID_CACHE: Map<Object, Digest> = new Map();

export abstract class Component {
	value: any;

	static schemaId(): Digest {
		// TODO: cache the schema IDs
		const name = this.componentName();
		const specificationId = compute_entity_id(entity_from_components(this.specification()));
		const schemaBytes = borshSerialize(
			BorshSchema.Struct({
				name: BorshSchema.String,
				specificationId: DigestSchema
				// TODO: Fix schema ID generation.
				// Current IDs are not to spec, because they don't include the Borsh Schema in the schema struct.
				// format: BorshSchemaSchema,
			}),
			{ name, specificationId }
		);
		const schemaId = blake3(schemaBytes);
		SCHEMA_ID_CACHE.set(Object.getPrototypeOf(this).constructor, schemaId);
		return schemaId;
	}
	static specification(): Component[] {
		return [];
	}
	static componentName(): string {
		return this.constructor.name;
	}
	static borshSchema(): BorshSchema {
		throw 'Component.borshSchema() must be implemented in subclass';
	}

	static deserialize(buf: Uint8Array): typeof this {
		return borshDeserialize(this.borshSchema(), buf);
	}

	serialize(): Uint8Array {
		return borshSerialize(Object.getPrototypeOf(this).constructor.borshSchema(), this.value);
	}
}

function arrEq(a: Uint8Array, b: Uint8Array) {
	return a.length == b.length && a.every((v, i) => v == b[i]);
}

export class GetComponentsResult {
	digest: Digest;
	components: Map<new (...any: any) => Component, Component[]>;

	constructor(digest: Digest, components: Map<new (...any: any) => Component, Component[]>) {
		this.digest = digest;
		this.components = components;
	}

	/** Get the first component of the given type from the result */
	get<C extends Component>(c: new (...any: any) => C): C | undefined {
		return this.components.get(c)?.[0] as C | undefined;
	}
}

export class RpcClient {
	#ws: ReconnectingWebSocket;
	#auth_token: undefined | string;
	#authenticated: boolean = false;
	#ready: Promise<void>;
	#set_websocket_ready: undefined | (() => void) = undefined;
	#next_req_id: bigint = 0n;
	#pending_reqs: Map<bigint, (resp: Resp) => void> = new Map();

	#next_id(): bigint {
		const i = this.#next_req_id;
		this.#next_req_id += 1n;
		return i;
	}

	async #send_req(kind: ReqKind): Promise<Resp> {
		if (this.#auth_token && !this.#authenticated) {
			const resp = await this.#send_req_inner({ Authenticate: this.#auth_token });
			if (resp.result && 'Ok' in resp.result) {
				const respKind = resp.result.Ok;
				if (!('Authenticated' in respKind)) {
					throw 'Error authenticating';
				}
			} else {
				throw `Error while authenticating: ${resp.result.Err}`;
			}
			this.#authenticated = true;
		}

		return await this.#send_req_inner(kind);
	}

	async #send_req_inner(kind: ReqKind): Promise<Resp> {
		return new Promise(async (resolve) => {
			await this.#ready;
			const req: Req = {
				id: this.#next_id(),
				kind
			};
			const reqData = borshSerialize(ReqSchema, req);
			this.#ws.send(reqData);

			this.#pending_reqs.set(req.id, resolve);
		});
	}

	constructor(url: string, auth_token?: string) {
		this.#auth_token = auth_token;
		this.#ws = new ReconnectingWebSocket(url) as any;
		this.#ready = new Promise((resolve) => {
			this.#set_websocket_ready = resolve;
		});

		this.#ws.onclose = () => {
			this.#authenticated = false;
			this.#ready = new Promise((resolve) => {
				this.#set_websocket_ready = resolve;
			});
		};
		this.#ws.onopen = async () => {
			this.#set_websocket_ready!();
		};

		this.#ws.onmessage = async (ev: MessageEvent) => {
			const data = 'arrayBuffer' in ev.data ? new Uint8Array(await ev.data.arrayBuffer()) : ev.data;
			const resp: Resp = borshDeserialize(RespSchema, data);
			this.#pending_reqs.get(resp.id)!(resp);
			this.#pending_reqs.delete(resp.id);
		};
	}

	#unwrap_resp(resp: Resp): RespKind {
		if ('Ok' in resp.result) {
			return resp.result.Ok;
		} else {
			throw `Leaf client error: ${resp.result.Err}`;
		}
	}

	async read_entity(link: ExactLink): Promise<{ digest: Digest; entity: Entity } | null> {
		const resp = await this.#send_req({ ReadEntity: link });
		const respKind = this.#unwrap_resp(resp);
		if ('ReadEntity' in respKind) {
			return (
				respKind.ReadEntity && {
					digest: new Uint8Array(respKind.ReadEntity.digest),
					entity: respKind.ReadEntity.entity.map((ent) => {
						return {
							component_id: new Uint8Array(ent.component_id),
							schema_id: ent.schema_id && new Uint8Array(ent.schema_id)
						};
					})
				}
			);
		} else {
			throw 'Invalid RPC response';
		}
	}

	async del_entity(link: ExactLink): Promise<Unit> {
		const resp = await this.#send_req({ DelEntity: link });
		const respKind = this.#unwrap_resp(resp);
		if ('DelEntity' in respKind) {
			return respKind.DelEntity;
		} else {
			throw 'Invalid RPC response';
		}
	}

	async list_entities(link: ExactLink): Promise<ExactLink[]> {
		const resp = await this.#send_req({ ListEntities: link });
		const respKind = this.#unwrap_resp(resp);
		if ('ListEntities' in respKind) {
			return respKind.ListEntities.map((ent) => {
				return {
					namespace: new Uint8Array(ent.namespace),
					subspace: new Uint8Array(ent.subspace),
					path: ent.path
				};
			});
		} else {
			throw 'Invalid RPC response';
		}
	}

	async del_components(
		link: ExactLink,
		components: (new (...any: any) => Component)[]
	): Promise<Digest | null> {
		const resp = await this.#send_req({
			DelComponentsBySchema: {
				link,
				schemas: components.map((component) => (component as any).schemaId())
			}
		});
		const respKind = this.#unwrap_resp(resp);
		if ('DelComponentsBySchema' in respKind) {
			return respKind.DelComponentsBySchema && new Uint8Array(respKind.DelComponentsBySchema);
		} else {
			throw 'Invalid RPC response';
		}
	}

	/**
	 * Allows you to add and delete a list of components with one function call.
	 *
	 * The components list is a list of items, each of which is either a component constructor, or a
	 * component instance.
	 *
	 * If it is a component constructor, then the component will be deleted from the entity, if it
	 * exists. If it is a component instance, then that component will be added to the entity.
	 *
	 * This allows you to do easy update / delete on components:
	 *
	 * ```ts
	 * await leafClient.updateComponents(pageLink, [
	 *     new Name(data.display_name),
	 *     data.markdown.length > 0 ? new CommonMark(data.markdown) : CommonMark,
	 * ]);
	 * ```
	 *
	 * @param link the entity to update the components of
	 * @param components the list of components
	 * @param replaceExisting whether or not added components replace existing ones.
	 */
	async updateComponents<C extends Component>(
		link: ExactLink,
		components: (C | (new (...any: any) => Component))[],
		replaceExisting = true
	) {
		const toAdd = [];
		const toDelete = [];
		for (const i of components) {
			// Here we just check it the schemaId function exists on the type. If it does, then it
			// is a component constructor.
			if ((i as any).schemaId) {
				toDelete.push(i);
			} else {
				toAdd.push(i);
			}
		}
		// TODO: add RPC method for adding and deleting at the same time.
		await this.del_components(link, toDelete as any);
		await this.add_components(link, toAdd as any, replaceExisting);
	}

	async add_components<C extends Component>(
		link: ExactLink,
		components: C[],
		replaceExisting = true
	): Promise<Digest> {
		let componentData = components.map((component) => {
			return {
				schema: Object.getPrototypeOf(component).constructor.schemaId(),
				data: component.serialize()
			};
		});
		const resp = await this.#send_req({
			AddComponents: {
				link,
				components: componentData,
				replace_existing: replaceExisting
			}
		});
		const respKind = this.#unwrap_resp(resp);
		if ('AddComponents' in respKind) {
			return new Uint8Array(respKind.AddComponents);
		} else {
			throw 'Invalid RPC response';
		}
	}

	async get_components(
		link: ExactLink,
		...components: (new (...any: any) => Component)[]
	): Promise<GetComponentsResult | null> {
		const schemas = components.map((component) => (component as any).schemaId());
		const resp = await this.#send_req({
			GetComponentsBySchema: {
				link,
				schemas
			}
		});
		const respKind = this.#unwrap_resp(resp);
		const map: Map<new (...any: any) => Component, Component[]> = new Map();
		if ('GetComponentsBySchema' in respKind) {
			let resp = respKind.GetComponentsBySchema;
			if (resp) {
				for (const data of resp.components) {
					const [comps_schema, comps_bytes] = data;
					let ctor = null;
					for (const c of components) {
						const id = (c as any).schemaId();
						if (arrEq(id, comps_schema)) {
							ctor = c;
							break;
						}
					}
					if (!ctor) throw 'Unreachable';
					const list = [];
					for (const comp_bytes of comps_bytes) {
						const componentKind: ComponentKind = borshDeserialize(ComponentKindSchema, comp_bytes);
						if ('Unencrypted' in componentKind) {
							const c = new ctor();
							c.value = (ctor as any).deserialize(componentKind.Unencrypted.component.data);
							list.push(c);
						}
					}
					map.set(ctor, list);
				}
				return new GetComponentsResult(new Uint8Array(resp.entity_digest), map);
			} else {
				return null;
			}
		} else {
			throw 'Invalid RPC response';
		}
	}

	async create_namespace(): Promise<NamespaceId> {
		const resp = await this.#send_req({ CreateNamespace: {} });
		const respKind = this.#unwrap_resp(resp);
		if ('CreateNamespace' in respKind) {
			return new Uint8Array(respKind.CreateNamespace);
		} else {
			throw 'Invalid RPC response';
		}
	}

	async import_namespace_secret(secret: NamespaceSecretKey): Promise<NamespaceId> {
		const resp = await this.#send_req({ ImportNamespaceSecret: secret });
		const respKind = this.#unwrap_resp(resp);
		if ('ImportNamespaceSecret' in respKind) {
			return new Uint8Array(respKind.ImportNamespaceSecret);
		} else {
			throw 'Invalid RPC response';
		}
	}

	async get_namespace_secret(namespace_id: NamespaceId): Promise<NamespaceSecretKey | null> {
		const resp = await this.#send_req({ GetNamespaceSecret: namespace_id });
		const respKind = this.#unwrap_resp(resp);
		if ('GetNamespaceSecret' in respKind) {
			return (respKind.GetNamespaceSecret && new Uint8Array(respKind.GetNamespaceSecret)) || null;
		} else {
			throw 'Invalid RPC response';
		}
	}

	async create_subspace(): Promise<SubspaceId> {
		const resp = await this.#send_req({ CreateSubspace: {} });
		const respKind = this.#unwrap_resp(resp);
		if ('CreateSubspace' in respKind) {
			return new Uint8Array(respKind.CreateSubspace);
		} else {
			throw 'Invalid RPC response';
		}
	}

	async import_subspace_secret(secret: SubspaceSecretKey): Promise<SubspaceId> {
		const resp = await this.#send_req({ ImportSubspaceSecret: secret });
		const respKind = this.#unwrap_resp(resp);
		if ('ImportSubspaceSecret' in respKind) {
			return new Uint8Array(respKind.ImportSubspaceSecret);
		} else {
			throw 'Invalid RPC response';
		}
	}

	async get_subspace_secret(subspace_id: SubspaceId): Promise<SubspaceSecretKey | null> {
		const resp = await this.#send_req({ GetSubspaceSecret: subspace_id });
		const respKind = this.#unwrap_resp(resp);
		if ('GetSubspaceSecret' in respKind) {
			return (respKind.GetSubspaceSecret && new Uint8Array(respKind.GetSubspaceSecret)) || null;
		} else {
			throw 'Invalid RPC response';
		}
	}

	/**
	 * Get's the value of a private secret that is stored locally on the Leaf RPC server and not
	 * shared over the network like the rest of the normal Leaf entity data, which is treated as
	 * public.
	 *
	 * @param key the key of the secret to get.
	 * @returns the value of the secret if it is present.
	 */
	async get_local_secret(key: string): Promise<string | undefined> {
		const resp = await this.#send_req({ GetLocalSecret: key });
		const respKind = this.#unwrap_resp(resp);
		if ('GetLocalSecret' in respKind) {
			return respKind.GetLocalSecret || undefined;
		} else {
			throw 'Invalid RPC response';
		}
	}

	/**
	 * Set's the value of a private secret that is stored locally on the Leaf RPC server and not
	 * shared over the network like the rest of the normal Leaf entity data, which is treated as
	 * public.
	 *
	 * @param key the key of the secret to get.
	 * @param value the value to set the secret to, or `undefined` if you want to delete it.
	 * @returns the value of the secret if it is present.
	 */
	async set_local_secret(key: string, value?: string): Promise<void> {
		const resp = await this.#send_req({ SetLocalSecret: { key, value } });
		const respKind = this.#unwrap_resp(resp);
		if ('SetLocalSecret' in respKind) {
			return;
		} else {
			throw 'Invalid RPC response';
		}
	}

	/**
	 * Lists all the keys and values of the private secrets that are stored locally on the Leaf RPC
	 * server.
	 *
	 * @returns the list of secrets.
	 */
	async list_local_secrets(): Promise<{ key: string; value: string }[]> {
		const resp = await this.#send_req({ ListLocalSecrets: {} });
		const respKind = this.#unwrap_resp(resp);
		if ('ListLocalSecrets' in respKind) {
			return respKind.ListLocalSecrets;
		} else {
			throw 'Invalid RPC response';
		}
	}
}
