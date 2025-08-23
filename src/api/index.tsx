import { randomBytes } from "node:crypto";
import { serve } from "bun";
import homepage from "@/index.html";
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
				const user = db.createUser(username, hash);
				if (!user) return new Response("Error creating user", { status: 400 });
				const token = makeSession(user.id);
				return new Response(JSON.stringify({ id: user.id, username }), {
					status: 201,
					headers: {
						"Content-Type": "application/json",
						"Set-Cookie": setSessionCookie(token),
					},
				});
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

		"/api/recipes/:id": {
			GET(req) {
				const user_id = getUserFromRequest(req);
				const recipe = db.getRecipeById(Number(req.params.id));
				// Allow access if recipe is public OR user owns the recipe
				if (!recipe.is_public && (!user_id || user_id !== recipe.user_id))
					return authFail();
				return Response.json(recipe, { status: 200 });
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
				const content = await req.text();
				const recipe = db.createRecipe(content, user_id);
				return Response.json(recipe, { status: 201 });
			},
		},

		"/api/users/:user_id/recipes/:id": {
			async PUT(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id || String(user_id) !== req.params.user_id)
					return authFail();
				const { id } = req.params;
				const content = await req.text();
				const recipe = db.updateRecipe(Number(id), content);
				return Response.json(recipe, { status: 200 });
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
