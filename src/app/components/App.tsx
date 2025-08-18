import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar.tsx";
import { Editor } from "./Editor.tsx";
import "./App.css";
import "../reset.css";
import { Recipe } from "@/shared/recipe.ts";

export function App() {
    // State to hold all recipes fetched from the server.
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    // State to track which recipe is currently selected in the UI.
    const [selectedId, setSelectedId] = useState<number | null>(null);
    // State to track if we are in "new recipe" mode.
    const [isCreating, setIsCreating] = useState(false);

    // On the initial component mount, fetch the list of all recipes.
    useEffect(() => {
        fetch("/api/recipes")
            .then((res) => res.json())
            .then((data) => setRecipes(data));
    }, []);

    // Memoize the selected recipe object to avoid re-calculating on every render.
    const selectedRecipe = useMemo(
        () => recipes.find((r) => r.id === selectedId) || null,
        [recipes, selectedId],
    );

    // Handles selecting an existing recipe from the sidebar.
    const handleSelectRecipe = (id: number) => {
        setSelectedId(id);
        setIsCreating(false);
    };

    // Handles clicking the "New Recipe" button.
    const handleNewRecipe = () => {
        setSelectedId(null);
        setIsCreating(true);
    };

    // Handles saving content from the editor, for both new and existing recipes.
    const handleSave = async (id: number | null, content: string) => {
        if (id === null) {
            // This is a new recipe, so we POST it to the server.
            const res = await fetch(`/api/recipes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            const newRecipe = await res.json();

            // Add the new recipe to our local state and select it.
            setRecipes([...recipes, newRecipe]);
            setSelectedId(newRecipe.id);
            setIsCreating(false);
        } else {
            // This is an existing recipe, so we PUT the updated content.
            await fetch(`/api/recipes/${id}`, {
                method: "PUT",
                body: content,
            });

            // Optimistically update the local state for a responsive UI.
            const updatedRecipe = Recipe.parse(content);
            // Preserve the original ID on the newly parsed recipe object.
            (updatedRecipe as any).id = id;
            const updatedRecipes = recipes.map((r) =>
                r.id === id ? updatedRecipe : r,
            );
            setRecipes(updatedRecipes);
        }
    };

    // A placeholder recipe object for the editor when creating a new recipe.
    const newRecipePlaceholder = useMemo(() => {
        // Create a valid Recipe instance from default content.
        const recipe = Recipe.parse("= Title\n\n# Step\n\n- Ingredient");
        // Manually set the id to null to signify this is a new recipe.
        // This is crucial for the handleSave logic to correctly identify a new recipe.
        (recipe as any).id = null;
        return recipe;
    }, []);

    return (
        <main className="app-container">
            <Sidebar
                recipes={recipes}
                selectedId={selectedId}
                onSelectRecipe={handleSelectRecipe}
                onNewRecipe={handleNewRecipe}
            />
            {/* Render the Editor if a recipe is selected OR if we are creating a new one. */}
            {(selectedRecipe || isCreating) && (
                <Editor
                    key={selectedRecipe?.id ?? "new"}
                    recipe={selectedRecipe ?? newRecipePlaceholder}
                    onSave={handleSave}
                />
            )}
        </main>
    );
}
