import { serve } from "bun";
import { Database } from "bun:sqlite";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import homepage from "@/index.html";
import { Recipe } from "@/shared/recipe.ts";

// --- Database Setup ---
const DB_PATH = join(process.cwd(), "recipes.sqlite");
const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");

// Initialize schema
db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       title TEXT NOT NULL UNIQUE,
       category TEXT NOT NULL,
       content TEXT NOT NULL
    );
`);

// --- Import existing recipes from filesystem ---
(async () => {
	const RECIPES_DIR = join(homedir(), "Documents", "Recipes");
	console.log(`Checking for recipes to import from ${RECIPES_DIR}...`);

	try {
		const files = await readdir(RECIPES_DIR);
		const recipeFiles = files.filter((file) => file.endsWith(".txt"));

		for (const file of recipeFiles) {
			const filePath = join(RECIPES_DIR, file);
			const content = await Bun.file(filePath).text();

			try {
				const recipe = Recipe.parse(content);
				const existing = db
					.query("SELECT id FROM recipes WHERE title = ?")
					.get(recipe.title);

				if (!existing) {
					db.prepare(
						"INSERT INTO recipes (title, category, content) VALUES (?, ?, ?)",
					).run(recipe.title, recipe.category, content);
					console.log(`- Imported "${recipe.title}"`);
				}
			} catch (parseError) {
				console.error(`Could not parse recipe file: ${file}`, parseError);
			}
		}
	} catch (readDirError) {
		console.warn(
			`Could not read recipe directory at ${RECIPES_DIR}. Skipping import.`,
		);
	}
})();

// --- Server ---
const server = serve({
	development: true,
	routes: {
		// --- Frontend Route ---
		"/": homepage,

		// --- API Routes ---
		"/api/recipes": {
			// GET /api/recipes
			GET() {
				const recipes = db
					.query("SELECT id, title, category, content FROM recipes")
					.all();
				return Response.json(recipes);
			},
			// POST /api/recipes
			async POST(req) {
				const { content } = await req.json();
				const recipe = Recipe.parse(content);

				const result = db
					.prepare(
						"INSERT INTO recipes (title, category, content) VALUES (?, ?, ?)",
					)
					.run(recipe.title, recipe.category, content);

				const newRecipe = {
					id: result.lastInsertRowid,
					title: recipe.title,
					category: recipe.category,
					content,
				};
				return Response.json(newRecipe, { status: 201 });
			},
		},
		"/api/recipes/:id": {
			// PUT /api/recipes/{id}
			async PUT(req) {
				const { id } = req.params;
				const content = await req.text();
				const recipe = Recipe.parse(content);

				db.prepare(
					"UPDATE recipes SET title = ?, category = ?, content = ? WHERE id = ?",
				).run(recipe.title, recipe.category, content, id);

				return new Response(`Recipe '${id}' updated.`);
			},
			// DELETE /api/recipes/{id}
			DELETE(req) {
				const { id } = req.params;
				db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
				return new Response(`Recipe '${id}' deleted.`);
			},
		},
	},
	error: () => new Response("Not Found", { status: 404 }),
});

console.log(`Listening on ${server.url}`);
console.log(`Database located at: ${DB_PATH}`);
