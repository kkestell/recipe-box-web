import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Recipe } from "@/shared/recipe.ts";

export function Homepage() {
	const [recipes, setRecipes] = useState<Recipe[]>([]);

	useEffect(() => {
		fetch("/api/recipes")
			.then((res) => res.json())
			.then((data: Recipe[]) => setRecipes(data));
	}, []);

	return (
		<main>
			<Link to="/log-in">
				<button>Log In</button>
			</Link>
			<Link to="/sign-up">
				<button>Sign Up</button>
			</Link>
			<h2>Public Recipes</h2>
			<ul>
				{recipes.map((recipe) => (
					<li key={recipe.id}>{recipe.title}</li>
				))}
			</ul>
		</main>
	);
}
