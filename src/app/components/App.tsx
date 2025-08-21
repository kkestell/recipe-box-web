import React, { type JSX } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useNavigate,
} from "react-router-dom";
import { useState, useMemo } from "react";
import { Header } from "./Header.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { Editor } from "./Editor.tsx";
import { LoginForm } from "./LoginForm.tsx";
import { SignupForm } from "./SignupForm.tsx";
import { Homepage } from "./Homepage.tsx";
import { Recipe } from "@/shared/recipe.ts";
import { useAuth } from "./hooks/useAuth.ts";
import { useRecipes } from "./hooks/useRecipes.ts";
import "@/app/css/reset.css";
import "@/app/css/main.css";

function ProtectedRoute({
	user,
	isLoading,
	children,
}: {
	user: any;
	isLoading: boolean;
	children: JSX.Element;
}) {
	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (!user) {
		return <Navigate to="/" replace />;
	}

	return children;
}

function AppContent() {
	const { user, setUser, logout, isLoading } = useAuth();
	const { recipes, saveRecipe, deleteRecipe, setRecipes } = useRecipes(user);
	const navigate = useNavigate();

	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	const selectedRecipe = useMemo(
		() => recipes.find((r) => r.id === selectedId) || null,
		[recipes, selectedId],
	);

	const handleSelectRecipe = (id: number) => {
		setSelectedId(id);
		setIsCreating(false);
	};

	const handleNewRecipe = () => {
		setSelectedId(null);
		setIsCreating(true);
	};

	const handleSave = async (id: number | null, content: string) => {
		const updatedRecipe = await saveRecipe(id, content);
		if (updatedRecipe) {
			setSelectedId(updatedRecipe.id);
			setIsCreating(false);
		}
	};

	const handleDelete = async (id: number) => {
		await deleteRecipe(id);
		setSelectedId(null);
	};

	const handleLogout = async () => {
		await logout();
		setRecipes([]);
		setSelectedId(null);
		setIsCreating(false);
		navigate("/");
	};

	const handleLoginSuccess = (user: any) => {
		setUser(user);
		navigate("/library");
	};

	const newRecipePlaceholder = useMemo(() => {
		const recipe = Recipe.parse("= Title\n\n# Step\n\n- Ingredient");
		(recipe as any).id = null;
		return recipe;
	}, []);

	const libraryPage = (
		<main className="app-container">
			<div className="container">
				<Sidebar
					recipes={recipes}
					selectedId={selectedId}
					onSelectRecipe={handleSelectRecipe}
					onNewRecipe={handleNewRecipe}
				/>
				{(selectedRecipe || isCreating) && (
					<Editor
						key={selectedRecipe?.id ?? "new"}
						recipe={selectedRecipe ?? Recipe.new()}
						onSave={handleSave}
						onDelete={handleDelete}
					/>
				)}
			</div>
		</main>
	);

	return (
		<>
			<Header user={user} onLogout={handleLogout} />
			<Routes>
				<Route path="/" element={<Homepage />} />
				<Route
					path="/log-in"
					element={<LoginForm onSuccess={handleLoginSuccess} />}
				/>
				<Route
					path="/sign-up"
					element={<SignupForm onSuccess={handleLoginSuccess} />}
				/>
				<Route
					path="/library"
					element={
						<ProtectedRoute user={user} isLoading={isLoading}>
							{libraryPage}
						</ProtectedRoute>
					}
				/>
			</Routes>
		</>
	);
}

export function App() {
	return (
		<BrowserRouter>
			<AppContent />
		</BrowserRouter>
	);
}
