import { useState } from "react";
import type { Recipe } from "@/shared/recipe.ts";

type SidebarProps = {
	recipes: Recipe[];
	selectedId: number | null;
	onSelectRecipe: (id: number) => void;
	onNewRecipe: () => void;
};

export function Sidebar({
	recipes,
	selectedId,
	onSelectRecipe,
	onNewRecipe,
}: SidebarProps) {
	const [searchQuery, setSearchQuery] = useState("");

	const filteredRecipes = recipes.filter((recipe) =>
		recipe.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const recipesByCategory = filteredRecipes.reduce(
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
			<div className="sidebar-header">
				<input
					type="text"
					placeholder="Search..."
					className="search-input"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				<button className="new-recipe-btn" onClick={onNewRecipe}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<title>New Recipe</title>
						<line x1="12" y1="5" x2="12" y2="19"></line>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
				</button>
			</div>
			<div className="recipe-list">
				{Object.entries(recipesByCategory)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([category, recipesInCategory]) => (
						<div key={category} className="category-group">
							<h3>{category}</h3>
							<ul>
								{recipesInCategory.map((recipe) => (
									<li
										key={recipe.id}
										className={recipe.id === selectedId ? "selected" : ""}
										onClick={() => onSelectRecipe(recipe.id!)}
									>
										{recipe.title}
									</li>
								))}
							</ul>
						</div>
					))}
			</div>
		</nav>
	);
}
