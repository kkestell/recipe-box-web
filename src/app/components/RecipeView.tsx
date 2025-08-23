import { Link } from "react-router-dom";
import { type ParsedRecipe, parseRecipe } from "@/shared/recipe.ts";

interface RecipeViewProps {
	recipe: ParsedRecipe;
}

export function RecipeView({ recipe }: RecipeViewProps) {
	console.log(recipe);
	return (
		<div className="recipe-view">
			<h1>{recipe.title}</h1>
			{recipe.components.map((component, componentIndex) => (
				<div className="component" key={componentIndex}>
					{component.name && <h2>{component.name}</h2>}
					{component.steps.map((step, stepIndex) => (
						<div className="step" key={stepIndex}>
							<p>{step.text}</p>
							{step.ingredients && (
								<ul>
									{step.ingredients.map((ingredient, ingredientIndex) => (
										<li key={ingredientIndex}>{ingredient}</li>
									))}
								</ul>
							)}
						</div>
					))}
				</div>
			))}
		</div>
	);
}
