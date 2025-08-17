import type { Recipe } from "./App";

// Define the props that the Sidebar component will accept.
type SidebarProps = {
	recipes: Recipe[];
	selectedSlug: string | null;
	onSelectRecipe: (slug: string) => void;
};

export function Sidebar({
	recipes,
	selectedSlug,
	onSelectRecipe,
}: SidebarProps) {
	// Group recipes by their category property to render them in sections.
	const recipesByCategory = recipes.reduce(
		(acc, recipe) => {
			const category = recipe.category || "Uncategorized";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(recipe);
			return acc;
		},
		{} as Record<string, Recipe[]>,
	);

	return (
		<nav className="sidebar">
			{/* Sort categories alphabetically and then map over them to render each group. */}
			{Object.entries(recipesByCategory)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([category, recipesInCategory]) => (
					<div key={category} className="category-group">
						<h3>{category}</h3>
						<ul>
							{/* Render each recipe within the category as a clickable list item. */}
							{recipesInCategory.map((recipe) => (
								<li
									key={recipe.slug}
									className={recipe.slug === selectedSlug ? "selected" : ""}
									onClick={() => onSelectRecipe(recipe.slug)}
								>
									{recipe.title}
								</li>
							))}
						</ul>
					</div>
				))}
		</nav>
	);
}
