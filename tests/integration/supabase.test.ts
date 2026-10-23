import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Skipped unless a local Supabase instance is reachable.
async function isReachable() {
	if (!url || !serviceRoleKey || !anonKey) {
		return false;
	}
	try {
		const response = await fetch(`${url}/rest/v1/`, {
			headers: { apikey: anonKey },
			signal: AbortSignal.timeout(2000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

const reachable = await isReachable();

const clientOptions = {
	auth: { persistSession: false, autoRefreshToken: false },
};
const password = "Test-password-123";
const randomName = (prefix: string) =>
	`${prefix}${randomBytes(4).toString("hex")}`;

interface TestUser {
	id: string;
	email: string;
	username: string;
	client: SupabaseClient;
}

/** `tree_activity_30d`: tree id -> [litres in 30 days, waterings in 30 days, adoptions]. */
type Activity = Record<string, [number, number, number]>;

describe.skipIf(!reachable)("Supabase schema, RLS and RPCs", () => {
	// url and keys are defined whenever `reachable` is true
	const admin = createClient(url!, serviceRoleKey!, clientOptions);
	const anon = createClient(url!, anonKey!, clientOptions);
	const createdUserIds: string[] = [];
	let treeIds: string[] = [];
	let userA: TestUser;
	let userB: TestUser;

	async function createUser(
		username: string,
		signedIn = true,
	): Promise<TestUser> {
		const email = `${randomName("it-")}@example.com`;
		const { data, error } = await admin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: { signup_username: username },
		});
		if (error || !data.user) {
			throw error ?? new Error("no user");
		}
		createdUserIds.push(data.user.id);

		const client = createClient(url!, anonKey!, clientOptions);
		if (signedIn) {
			const { error: signInError } = await client.auth.signInWithPassword({
				email,
				password,
			});
			if (signInError) {
				throw signInError;
			}
		}
		const { data: profile } = await admin
			.from("profiles")
			.select("username")
			.eq("id", data.user.id)
			.single();
		return {
			id: data.user.id,
			email,
			username: profile?.username ?? "",
			client,
		};
	}

	beforeAll(async () => {
		const { data, error } = await admin.from("trees").select("id").limit(3);
		if (error || !data || data.length < 3) {
			throw new Error(
				"The trees table is not seeded. Run `npx supabase db reset`.",
			);
		}
		treeIds = data.map((t) => t.id);
		userA = await createUser(randomName("usera"));
		userB = await createUser(randomName("userb"));
	});

	afterAll(async () => {
		await admin.from("trees_watered").delete().in("tree_id", treeIds);
		await admin.from("trees_adopted").delete().in("tree_id", treeIds);
		for (const id of createdUserIds) {
			await admin.auth.admin.deleteUser(id);
		}
	});

	describe("anonymous access", () => {
		test("can read trees", async () => {
			const { data, error } = await anon.from("trees").select("id").limit(1);
			expect(error).toBeNull();
			expect(data).toHaveLength(1);
		});

		test("cannot write trees", async () => {
			const { error } = await anon
				.from("trees")
				.update({ suburb: "x" })
				.eq("id", treeIds[0]);
			expect(error).not.toBeNull();
		});

		test("cannot insert waterings", async () => {
			const { error } = await anon
				.from("trees_watered")
				.insert({ tree_id: treeIds[0], amount: 10 });
			expect(error).not.toBeNull();
		});

		test("cannot read profiles", async () => {
			const { error } = await anon.from("profiles").select("*");
			expect(error).not.toBeNull();
		});

		test("can call the public RPCs", async () => {
			const activity = await anon.rpc("tree_activity_30d");
			expect(activity.error).toBeNull();
			const waterings = await anon.rpc("waterings_for_tree", {
				t_id: treeIds[0],
			});
			expect(waterings.error).toBeNull();
			const taken = await anon.rpc("is_username_taken", {
				given_username: "nobodyhasthis",
			});
			expect(taken.error).toBeNull();
			expect(taken.data).toBe(false);
		});

		test("cannot call account RPCs", async () => {
			expect((await anon.rpc("remove_account")).error).not.toBeNull();
			expect(
				(await anon.rpc("waterings_for_user", { u_id: userA.id })).error,
			).not.toBeNull();
		});
	});

	describe("waterings", () => {
		test("a user can insert and delete their own watering", async () => {
			const { data, error } = await userA.client
				.from("trees_watered")
				.insert({ tree_id: treeIds[0], amount: 25, uuid: userA.id })
				.select()
				.single();
			expect(error).toBeNull();

			const listed = await anon.rpc("waterings_for_tree", { t_id: treeIds[0] });
			expect(listed.data).toContainEqual(
				expect.objectContaining({
					id: data!.id,
					amount: 25,
					username: userA.username,
				}),
			);

			const { error: deleteError } = await userA.client
				.from("trees_watered")
				.delete()
				.eq("id", data!.id);
			expect(deleteError).toBeNull();
			const { data: after } = await admin
				.from("trees_watered")
				.select("id")
				.eq("id", data!.id);
			expect(after).toHaveLength(0);
		});

		test("a user cannot insert a watering for someone else", async () => {
			const { error } = await userA.client
				.from("trees_watered")
				.insert({ tree_id: treeIds[0], amount: 10, uuid: userB.id });
			expect(error).not.toBeNull();
		});

		test("a user cannot delete another user's watering", async () => {
			const { data } = await userB.client
				.from("trees_watered")
				.insert({ tree_id: treeIds[1], amount: 40, uuid: userB.id })
				.select()
				.single();

			await userA.client.from("trees_watered").delete().eq("id", data!.id);
			const { data: stillThere } = await admin
				.from("trees_watered")
				.select("id")
				.eq("id", data!.id);
			expect(stillThere).toHaveLength(1);
		});

		test("waterings_for_user returns nothing for another user", async () => {
			const own = await userB.client.rpc("waterings_for_user", {
				u_id: userB.id,
			});
			expect(own.data!.length).toBeGreaterThan(0);

			const other = await userA.client.rpc("waterings_for_user", {
				u_id: userB.id,
			});
			expect(other.error).toBeNull();
			expect(other.data).toEqual([]);
		});

		test("rejects amount 0 and amounts above the maximum", async () => {
			for (const amount of [0, -5, 1001]) {
				const { error } = await userA.client
					.from("trees_watered")
					.insert({ tree_id: treeIds[0], amount, uuid: userA.id });
				expect(error, `amount ${amount}`).not.toBeNull();
			}
		});

		test("tree_activity_30d sums recent waterings only", async () => {
			const tree = treeIds[2];
			const { error: insertError } = await admin.from("trees_watered").insert([
				{
					tree_id: tree,
					amount: 30,
					uuid: userA.id,
					timestamp: new Date().toISOString(),
				},
				{
					tree_id: tree,
					amount: 20,
					uuid: userB.id,
					timestamp: new Date().toISOString(),
				},
				{
					tree_id: tree,
					amount: 500,
					uuid: userA.id,
					timestamp: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
				},
			]);
			expect(insertError).toBeNull();
			const { data } = await anon.rpc("tree_activity_30d");
			const [litres, waterings] = (data as Activity)[tree];
			expect(litres).toBe(50);
			expect(waterings).toBe(2);
		});
	});

	describe("adoptions", () => {
		test("a user can adopt and unadopt; adoption counts show in the activity", async () => {
			const tree = treeIds[0];
			const adopt = await userA.client
				.from("trees_adopted")
				.insert({ tree_id: tree, uuid: userA.id });
			expect(adopt.error).toBeNull();

			const duplicate = await userA.client
				.from("trees_adopted")
				.insert({ tree_id: tree, uuid: userA.id });
			expect(duplicate.error).not.toBeNull();

			const { data } = await anon.rpc("tree_activity_30d");
			const [, , adoptions] = (data as Activity)[tree];
			expect(adoptions).toBe(1);

			await userA.client
				.from("trees_adopted")
				.delete()
				.eq("tree_id", tree)
				.eq("uuid", userA.id);
			const { data: after } = await admin
				.from("trees_adopted")
				.select("id")
				.eq("tree_id", tree);
			expect(after).toHaveLength(0);
		});

		test("a user cannot remove another user's adoption", async () => {
			await userB.client
				.from("trees_adopted")
				.insert({ tree_id: treeIds[1], uuid: userB.id });
			await userA.client
				.from("trees_adopted")
				.delete()
				.eq("tree_id", treeIds[1]);
			const { data } = await admin
				.from("trees_adopted")
				.select("id")
				.eq("tree_id", treeIds[1])
				.eq("uuid", userB.id);
			expect(data).toHaveLength(1);
		});
	});

	// PostgREST cuts row results off at `max_rows` (1000, supabase/config.toml)
	// without an error, so these return a single jsonb value instead.
	describe("results larger than PostgREST's row limit", () => {
		const count = 1001;
		let manyTreeIds: string[] = [];
		let collector: TestUser;

		beforeAll(async () => {
			// Two requests: the service role is subject to the row limit too.
			for (const [from, to] of [
				[0, 999],
				[1000, 1099],
			]) {
				const { data, error } = await admin
					.from("trees")
					.select("id")
					.order("id")
					.range(from, to);
				if (error) {
					throw error;
				}
				manyTreeIds.push(...data.map((tree) => tree.id));
			}
			manyTreeIds = manyTreeIds
				.filter((id) => !treeIds.includes(id))
				.slice(0, count);
			collector = await createUser(randomName("collector"));
		});

		afterAll(async () => {
			await admin.from("trees_watered").delete().eq("uuid", collector.id);
			await admin.from("trees_adopted").delete().eq("uuid", collector.id);
		});

		test("tree_activity_30d covers every tree with activity", async () => {
			const { error } = await admin
				.from("trees_adopted")
				.insert(
					manyTreeIds.map((tree_id) => ({ tree_id, uuid: collector.id })),
				);
			expect(error).toBeNull();

			const { data, error: rpcError } = await anon.rpc("tree_activity_30d");
			expect(rpcError).toBeNull();
			const activity = data as Activity;
			expect(Object.keys(activity).length).toBeGreaterThan(1000);
			const missing = manyTreeIds.filter((id) => !(activity[id]?.[2] >= 1));
			expect(missing).toEqual([]);
		});

		test("waterings_for_user returns all of a user's waterings", async () => {
			const { error } = await admin.from("trees_watered").insert(
				manyTreeIds.map((tree_id) => ({
					tree_id,
					amount: 1,
					uuid: collector.id,
				})),
			);
			expect(error).toBeNull();

			const { data, error: rpcError } = await collector.client.rpc(
				"waterings_for_user",
				{ u_id: collector.id },
			);
			expect(rpcError).toBeNull();
			expect(data).toHaveLength(manyTreeIds.length);
			expect(data[0]).toEqual({
				id: expect.any(Number),
				tree_id: expect.any(String),
				amount: 1,
				timestamp: expect.any(String),
				username: collector.username,
			});
		});
	});

	describe("usernames", () => {
		test("is_username_taken ignores case", async () => {
			const { data } = await anon.rpc("is_username_taken", {
				given_username: userA.username.toUpperCase(),
			});
			expect(data).toBe(true);
		});

		test("signing up with a taken username still creates a suffixed profile", async () => {
			const duplicate = await createUser(userA.username.toUpperCase(), false);
			expect(duplicate.username).not.toBe(userA.username.toUpperCase());
			expect(
				duplicate.username
					.toLowerCase()
					.startsWith(userA.username.toLowerCase()),
			).toBe(true);
			expect(duplicate.username).toMatch(/^[a-zA-Z0-9]{3,50}$/);
		});

		test("usernames are sanitised to the allowed characters", async () => {
			const user = await createUser("a-b_c", false);
			expect(user.username).toMatch(/^[a-zA-Z0-9]{3,50}$/);
		});

		test("a user can change their username, but not to an invalid one", async () => {
			const newName = randomName("renamed");
			const ok = await userB.client
				.from("profiles")
				.update({ username: newName })
				.eq("id", userB.id);
			expect(ok.error).toBeNull();
			userB.username = newName;

			const bad = await userB.client
				.from("profiles")
				.update({ username: "no spaces!" })
				.eq("id", userB.id);
			expect(bad.error).not.toBeNull();
		});
	});

	describe("remove_account", () => {
		test("removes profile and adoptions, keeps waterings without a user", async () => {
			const user = await createUser(randomName("leaver"));
			const tree = treeIds[2];
			await user.client
				.from("trees_adopted")
				.insert({ tree_id: tree, uuid: user.id });
			const { data: watering } = await user.client
				.from("trees_watered")
				.insert({ tree_id: tree, amount: 12, uuid: user.id })
				.select()
				.single();

			const { error } = await user.client.rpc("remove_account");
			expect(error).toBeNull();

			const { data: profile } = await admin
				.from("profiles")
				.select("id")
				.eq("id", user.id);
			expect(profile).toHaveLength(0);
			const { data: adoptions } = await admin
				.from("trees_adopted")
				.select("id")
				.eq("uuid", user.id);
			expect(adoptions).toHaveLength(0);

			const { data: kept } = await admin
				.from("trees_watered")
				.select("uuid")
				.eq("id", watering!.id)
				.single();
			expect(kept?.uuid).toBeNull();

			const { data: listed } = await anon.rpc("waterings_for_tree", {
				t_id: tree,
			});
			expect(listed).toContainEqual(
				expect.objectContaining({ id: watering!.id, username: null }),
			);
		});
	});
});
