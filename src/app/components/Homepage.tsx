import { useState, useEffect } from "react";
import { Recipe } from "@/shared/recipe.ts";

type Props = {
    showLogin: () => void;
    showSignup: () => void;
};

export function Homepage({ showLogin, showSignup }: Props) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    useEffect(() => {
        fetch("/api/recipes")
            .then((res) => res.json())
            .then((data: Recipe[]) => setRecipes(data));
    }, []);

    return (
        <main>
            <button onClick={showLogin}>Log In</button>
            <button onClick={showSignup}>Sign Up</button>
            <h2>Public Recipes</h2>
            <ul>
                {recipes.map((recipe) => (
                    <li key={recipe.id}>{recipe.title}</li>
                ))}
            </ul>
        </main>
    );
}