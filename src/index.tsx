import { serve } from "bun";
import { readdir, writeFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join, parse as parsePath } from "node:path";
import homepage from "./index.html";
import { Recipe } from "./recipe";

// Define the directory where recipes are stored and ensure it exists.
const RECIPES_DIR = join(homedir(), "Documents", "Recipes");
await Bun.write(join(RECIPES_DIR, ".keep"), "");

// --- Helper Functions ---
function createSlug(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

// --- Server ---

const server = serve({
	development: true,
	routes: {
		// --- Frontend Route ---
		"/": homepage,

		// --- API Routes ---
		"/api/recipes": {
			// GET /api/recipes
			async GET() {
				const files = await readdir(RECIPES_DIR);
				const recipePromises = files
					.filter((file) => file.endsWith(".txt"))
					.map(async (file) => {
						const slug = parsePath(file).name;
						const content = await Bun.file(join(RECIPES_DIR, file)).text();
						const recipe = Recipe.parse(content);
						return {
							slug,
							title: recipe.title,
							category: recipe.category,
							content,
						};
					});
				const recipes = await Promise.all(recipePromises);
				return Response.json(recipes);
			},
			// POST /api/recipes
			async POST(req) {
				const { content } = await req.json();
				const recipe = Recipe.parse(content);
				const newSlug = createSlug(recipe.title);
				const newPath = join(RECIPES_DIR, `${newSlug}.txt`);

				if (await Bun.file(newPath).exists()) {
					return new Response("Recipe with this title already exists", {
						status: 409,
					});
				}

				await writeFile(newPath, content);
				const newRecipe = {
					title: recipe.title,
					slug: newSlug,
					category: recipe.category,
					content,
				};
				return Response.json(newRecipe, { status: 201 });
			},
		},
		"/api/recipes/:slug": {
			// PUT /api/recipes/{slug}
			async PUT(req) {
				const { slug } = req.params;
				const content = await req.text();
				const filePath = join(RECIPES_DIR, `${slug}.txt`);
				await writeFile(filePath, content);
				return new Response(`Recipe '${slug}' updated.`);
			},
			// DELETE /api/recipes/{slug}
			async DELETE(req) {
				const { slug } = req.params;
				const filePath = join(RECIPES_DIR, `${slug}.txt`);
				await rm(filePath);
				return new Response(`Recipe '${slug}' deleted.`);
			},
		},
	},
	error: () => new Response("Not Found", { status: 404 }),
});

console.log(`Listening on ${server.url}`);
console.log(`Recipe directory: ${RECIPES_DIR}`);
