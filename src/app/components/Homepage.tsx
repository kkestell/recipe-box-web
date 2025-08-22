import { useState, useEffect } from "react";
import {type Recipe, type ParsedRecipe, parseRecipe, type ExistingRecipe} from "@/shared/recipe.ts";

export function Homepage() {
    const [recipes, setRecipes] = useState<ExistingRecipe[]>([]);

    useEffect(() => {
        fetch("/api/recipes")
            .then((res) => res.json())
            .then((data: ExistingRecipe[]) => setRecipes(data));
    }, []);

    return (
        <main className="homepage">
            <h2>Public Recipes</h2>
            <ul>
                {recipes.map((recipe) => {
                    const [parsed, errors] = parseRecipe(recipe.content);
                    if (errors.length > 0) {
                        return (<li key={recipe.id}>Error!</li>)
                    }
                    return (
                        <li key={recipe.id}>{recipe.title} {parsed.metadata["category"] ?? "Uncategorized"}</li>
                    );
                })}
            </ul>
        </main>
    );
}