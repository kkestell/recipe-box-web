import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { RecipeView } from "@/app/components/RecipeView.tsx";
import {
	type ExistingRecipe,
	type ParsedRecipe,
	parseRecipe,
} from "@/shared/recipe.ts";

export function RecipePage() {
	const { id } = useParams();
	const [recipe, setRecipe] = useState<ParsedRecipe>();

	useEffect(() => {
		fetch(`/api/recipes/${id}`)
			.then((res) => res.json())
			.then((data: ExistingRecipe) => {
				const [parsed, errors] = parseRecipe(data.content);
				if (errors.length > 0) throw new Error("Invalid recipe!");
				setRecipe(parsed);
			});
	}, [id]);

	return (
		<main className="recipe-page">
			{recipe ? <RecipeView recipe={recipe} /> : <p>Loading...</p>}
		</main>
	);
}
