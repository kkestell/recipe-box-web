import { useState, useEffect } from "react";
import { Recipe } from "@/shared/recipe.ts";

export function Homepage() {
	const [recipes, setRecipes] = useState<Recipe[]>([]);

	useEffect(() => {
		fetch("/api/recipes")
			.then((res) => res.json())
			.then((data: Recipe[]) => setRecipes(data));
	}, []);

	return (
		<main className="homepage">
			<h2>Public Recipes</h2>
			<ul>
				{recipes.map((recipe) => (
					<li key={recipe.id}>{recipe.title}</li>
				))}
			</ul>
		</main>
	);
}
