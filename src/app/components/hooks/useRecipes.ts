import { useState, useEffect } from "react";
import {type Recipe} from "@/shared/recipe.ts";

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
	}, [user]);

	const saveRecipe = async (id: number | null, content: string) => {
		if (!user) return null;

        // Create a new recipe
        if (id === null) {
            const res = await fetch(`/api/users/${user.id}/recipes`, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: content,
            });
            if (!res.ok) return null;
            const newRecipe: Recipe = await res.json();
            setRecipes((prev) => [...prev, newRecipe]);
            return newRecipe;
        }
        // Update an existing recipe
        else {
            const res = await fetch(`/api/users/${user.id}/recipes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "text/plain" },
                body: content,
            });
            if (!res.ok) return null;
            const updatedRecipe: Recipe = await res.json();
            setRecipes((prev) =>
                prev.map((r) => (r.id === id ? updatedRecipe : r)),
            );
            return updatedRecipe;
        }
	};

	const deleteRecipe = async (id: number) => {
		if (!user) return;
        const res = await fetch(`/api/users/${user.id}/recipes/${id}`, {
            method: "DELETE",
        });
        if (res.ok) {
            setRecipes((prev) => prev.filter((r) => r.id !== id));
        }
	};

	return { recipes, setRecipes, saveRecipe, deleteRecipe };
}
