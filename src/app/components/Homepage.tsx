import { useState, useEffect } from "react";
import { type Recipe, ParsedRecipe, parseRecipe } from "@/shared/recipe.ts";

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
                {recipes.map((recipe) => {
                    const parsed: ParsedRecipe = parseRecipe(recipe.content);
                    return (
                        <li key={recipe.id}>{parsed.title}</li>
                    );
                })}
            </ul>
        </main>
    );
}