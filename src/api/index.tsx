import { serve } from "bun";
import { Database } from "bun:sqlite";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import homepage from "@/index.html";
import { Recipe } from "@/shared/recipe.ts";

// --- Database Setup ---
const DB_PATH = join(process.cwd(), "data", "recipes.sqlite");
const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");

db.run(`
    CREATE TABLE IF NOT EXISTS users (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         username TEXT NOT NULL UNIQUE,
                                         password_hash TEXT NOT NULL
    );
`);

db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            user_id INTEGER NOT NULL,
                                            token TEXT NOT NULL UNIQUE,
                                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            FOREIGN KEY (user_id) REFERENCES users(id)
        );
`);

db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
                                           id INTEGER PRIMARY KEY AUTOINCREMENT,
                                           title TEXT NOT NULL,
                                           category TEXT NOT NULL,
                                           content TEXT NOT NULL,
                                           is_public INTEGER NOT NULL DEFAULT 0,
                                           user_id INTEGER NOT NULL,
                                           FOREIGN KEY (user_id) REFERENCES users(id)
        );
`);

// --- Utilities ---
function makeSession(user_id: number) {
	const token = randomBytes(32).toString("hex");
	db.prepare("INSERT INTO sessions (user_id, token) VALUES (?, ?)").run(
		user_id,
		token,
	);
	return token;
}

function getUserFromRequest(req: Request) {
	const cookie = req.headers.get("cookie") || "";
	const match = cookie.match(/session_token=([a-f0-9]+)/);
	if (!match) return null;
	const token = match[1];
	const row = db
		.query("SELECT user_id FROM sessions WHERE token = ?")
		.get(token!) as { user_id: number } | undefined;
	if (!row) return null;
	return row.user_id;
}

function authFail() {
	return new Response("Unauthorized", { status: 401 });
}

function setSessionCookie(token: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const secure = isProduction ? 'Secure; ' : '';
    return `session_token=${token}; HttpOnly; ${secure}SameSite=Strict; Path=/`;
}

// --- Server ---
const server = serve({
	development: true,
	routes: {
		// --- Auth Routes ---
		"/api/signup": {
			async POST(req) {
				const { username, password } = await req.json();
				const hash = await Bun.password.hash(password, {
					algorithm: "bcrypt",
				});
				try {
					const result = db
						.prepare(
							"INSERT INTO users (username, password_hash) VALUES (?, ?)",
						)
						.run(username, hash);

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
					return new Response("Username already exists", {
						status: 400,
					});
				}
			},
		},

		"/api/login": {
			async POST(req) {
				const { username, password } = await req.json();
				const row = db
					.query("SELECT id, password_hash FROM users WHERE username = ?")
					.get(username) as { id: number; password_hash: string } | undefined;
				if (!row) return authFail();

				const valid = await Bun.password.verify(password, row.password_hash);
				if (!valid) return authFail();

				const token = makeSession(row.id);
				return new Response(JSON.stringify({ id: row.id, username }), {
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
					db.prepare("DELETE FROM sessions WHERE token = ?").run(match[1]!);
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
				const row = db
					.query("SELECT id, username FROM users WHERE id = ?")
					.get(user_id);
				return Response.json(row);
			},
		},

		// --- Public Recipe Route ---
		"/api/recipes": {
			GET() {
				const publicRecipes = db
					.query(
						"SELECT id, title, category, content FROM recipes WHERE is_public = 1",
					)
					.all();
				return Response.json(publicRecipes);
			},
		},

		// --- User-Specific Recipe Routes ---
		"/api/users/:user_id/recipes": {
			GET(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id) return authFail();
				if (String(user_id) !== req.params.user_id) return authFail();

				const recipes = db
					.query(
						"SELECT id, title, category, content FROM recipes WHERE user_id = ?",
					)
					.all(user_id);
				return Response.json(recipes);
			},
			async POST(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id) return authFail();
				if (String(user_id) !== req.params.user_id) return authFail();

				const { content } = await req.json();
				const recipe = Recipe.parse(content);

				const result = db
					.prepare(
						"INSERT INTO recipes (title, category, content, is_public, user_id) VALUES (?, ?, ?, ?, ?)",
					)
					.run(
						recipe.title,
						recipe.category,
						content,
						recipe.public ? 1 : 0,
						user_id,
					);

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
				if (!user_id) return authFail();
				if (String(user_id) !== req.params.user_id) return authFail();

				const { id } = req.params;
				const content = await req.text();
				const recipe = Recipe.parse(content);

				db.prepare(
					"UPDATE recipes SET title = ?, category = ?, content = ?, is_public = ? WHERE id = ? AND user_id = ?",
				).run(
					recipe.title,
					recipe.category,
					content,
					recipe.public ? 1 : 0,
					id,
					user_id,
				);

				return new Response(`Recipe '${id}' updated.`);
			},
			DELETE(req) {
				const user_id = getUserFromRequest(req);
				if (!user_id) return authFail();
				if (String(user_id) !== req.params.user_id) return authFail();

				const { id } = req.params;
				db.prepare("DELETE FROM recipes WHERE id = ? AND user_id = ?").run(
					id,
					user_id,
				);
				return new Response(`Recipe '${id}' deleted.`);
			},
		},

		// --- API 404 Fallback ---
		"/api/*": () => new Response("Not Found", { status: 404 }),

		// --- SPA Fallback Route ---
		"/*": homepage,
	},
	error: () => new Response("Not Found", { status: 404 }),
});

console.log(`Listening on ${server.url}`);
console.log(`Database located at: ${DB_PATH}`);
