import { useState, useEffect } from "react";
import { Recipe } from "@/shared/recipe.ts";

type User = { id: number; username: string };

export function useRecipes(user: User | null) {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    // Fetch recipes when the user logs in.
    useEffect(() => {
        if (!user) return;
        fetch(`/api/users/${user.id}/recipes`)
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json();
                    setRecipes(data);
                }
            })
            .catch(() => {
                // Handle fetch errors
            });
    }, [user]);

    const saveRecipe = async (id: number | null, content: string) => {
        if (!user) return null;

        try {
            // Create a new recipe
            if (id === null) {
                const res = await fetch(`/api/users/${user.id}/recipes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content }),
                });
                if (!res.ok) return null;
                const newRecipe = await res.json();
                setRecipes((prev) => [...prev, newRecipe]);
                return newRecipe;
            }

            // Update an existing recipe
            else {
                const res = await fetch(`/api/users/${user.id}/recipes/${id}`, {
                    method: "PUT",
                    body: content,
                });
                if (!res.ok) return null;
                const updatedRecipe = Recipe.parse(content);
                (updatedRecipe as any).id = id;
                setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)));
                return updatedRecipe;
            }
        } catch (error) {
            return null;
        }
    };

    const deleteRecipe = async (id: number) => {
        if (!user) return;
        try {
            const res = await fetch(`/api/users/${user.id}/recipes/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setRecipes((prev) => prev.filter((r) => r.id !== id));
            }
        } catch (error) {
            // Handle error
        }
    };

    return { recipes, setRecipes, saveRecipe, deleteRecipe };
}