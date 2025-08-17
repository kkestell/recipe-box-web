import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import "./index.css";

// Define the shape of a recipe object for type safety across the app.
export type Recipe = {
	slug: string;
	title: string;
	category: string;
	content: string;
};

export function App() {
	// State to hold all recipes fetched from the server.
	const [recipes, setRecipes] = useState<Recipe[]>([]);
	// State to track which recipe is currently selected in the UI.
	const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

	// On the initial component mount, fetch the list of all recipes.
	useEffect(() => {
		fetch("/api/recipes")
			.then((res) => res.json())
			.then((data) => setRecipes(data));
	}, []);

	// Memoize the selected recipe object to avoid re-calculating on every render.
	// This finds the full recipe object based on the `selectedSlug`.
	const selectedRecipe = useMemo(
		() => recipes.find((r) => r.slug === selectedSlug) || null,
		[recipes, selectedSlug],
	);

	// Handles saving the content of a recipe.
	const handleSave = async (slug: string, content: string) => {
		// Send the updated content to the server.
		await fetch(`/api/recipes/${slug}`, {
			method: "PUT",
			body: content,
		});

		// Optimistically update the local state for a responsive UI,
		// assuming the server save was successful.
		const updatedRecipes = recipes.map((r) =>
			r.slug === slug ? { ...r, content } : r,
		);
		setRecipes(updatedRecipes);
	};

	// Render the main layout with Sidebar and Editor components.
	return (
		<main className="app-container">
			<Sidebar
				recipes={recipes}
				selectedSlug={selectedSlug}
				onSelectRecipe={setSelectedSlug}
			/>
			{/* Only render the Editor if a recipe is selected.
        The `key` prop is crucial here: it forces React to re-mount the Editor
        component when the selected recipe changes, ensuring its internal
        state (like the textarea content) is reset correctly.
      */}
			{selectedRecipe && (
				<Editor
					key={selectedRecipe.slug}
					recipe={selectedRecipe}
					onSave={handleSave}
				/>
			)}
		</main>
	);
}

export default App;
