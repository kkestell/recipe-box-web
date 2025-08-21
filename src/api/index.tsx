import { serve } from "bun";
import { randomBytes } from "node:crypto";
import homepage from "@/index.html";
import { Recipe } from "@/shared/recipe.ts";
import { Database } from "./database.ts";

const db = new Database();
db.init_db();

function makeSession(user_id: number) {
	const token = randomBytes(32).toString("hex");
	db.createSession(user_id, token);
	return token;
}

function getUserFromRequest(req: Request) {
	const cookie = req.headers.get("cookie") || "";
	const match = cookie.match(/session_token=([a-f0-9]+)/);
	if (!match) return null;
	const token = match[1];
	if (!token) return null;
	return db.getUserIdBySessionToken(token);
}

function authFail() {
	return new Response("Unauthorized", { status: 401 });
}

function setSessionCookie(token: string) {
	const isProduction = process.env.NODE_ENV === "production";
	const secure = isProduction ? "Secure; " : "";
	return `session_token=${token}; HttpOnly; ${secure}SameSite=Strict; Path=/`;
}

const server = serve({
	development: true,
	routes: {
		"/api/signup": {
			async POST(req) {
				const { username, password } = await req.json();
				const hash = await Bun.password.hash(password, { algorithm: "bcrypt" });
				try {
					const result = db.createUser(username, hash);
					const token = makeSession(Number(result.lastInsertRowid));
					return new Response(
						JSON.stringify({ id: result.lastInsertRowid, username }),
						{
							status: 201,
							headers: {
								"Content-Type": "application/json",
								"Set-Cookie": setSessionCookie(token),
							},
						},
					);
				} catch {
					return new Response("Username already exists", { status: 400 });
				}
			},
		},

		"/api/login": {
			async POST(req) {
				const { username, password } = await req.json();
				const user = db.getUserByUsername(username);
				if (!user) return authFail();

				const valid = await Bun.password.verify(password, user.password_hash);
				if (!valid) return authFail();

				const token = makeSession(user.id);
				return new Response(JSON.stringify({ id: user.id, username }), {
					headers: {
						"Content-Type": "application/json",
						"Set-Cookie": setSessionCookie(token),
					},
				});
			},
		},

		"/api/logout": {
			POST(req) {
				const cookie = req.headers.get("cookie") || "";
				const match = cookie.match(/session_token=([a-f0-9]+)/);
				if (match) {
					db.deleteSession(match[1]!);
				}
				return new Response("Logged out", {
					headers: {
						"Set-Cookie":
							"session_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
					},
				});
			},
		},

		"/api/me": {
			GET(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id) return authFail();
				const user = db.getUserById(user_id);
				return Response.json(user);
			},
		},

		"/api/recipes": {
			GET() {
				const publicRecipes = db.getPublicRecipes();
				return Response.json(publicRecipes);
			},
		},

		"/api/users/:user_id/recipes": {
			GET(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id || String(user_id) !== req.params.user_id)
					return authFail();

				const recipes = db.getUserRecipes(user_id);
				return Response.json(recipes);
			},
			async POST(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id || String(user_id) !== req.params.user_id)
					return authFail();

				const { content } = await req.json();
				const recipe = Recipe.parse(content);
				const result = db.createRecipe(recipe, content, user_id);

				const newRecipe = {
					id: result.lastInsertRowid,
					title: recipe.title,
					category: recipe.category,
					content,
				};
				return Response.json(newRecipe, { status: 201 });
			},
		},

		"/api/users/:user_id/recipes/:id": {
			async PUT(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id || String(user_id) !== req.params.user_id)
					return authFail();

				const { id } = req.params;
				const content = await req.text();
				const recipe = Recipe.parse(content);
				db.updateRecipe(Number(id), recipe, content, user_id);
				return new Response(`Recipe '${id}' updated.`);
			},
			DELETE(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id || String(user_id) !== req.params.user_id)
					return authFail();

				const { id } = req.params;
				db.deleteRecipe(Number(id), user_id);
				return new Response(`Recipe '${id}' deleted.`);
			},
		},

		"/api/*": () => new Response("Not Found", { status: 404 }),

		"/*": homepage,
	},
	error: () => new Response("Not Found", { status: 404 }),
});

console.log(`Listening on ${server.url}`);
