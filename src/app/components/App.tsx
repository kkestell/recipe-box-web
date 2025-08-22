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
import { useAuth } from "./hooks/useAuth.ts";
import { useRecipes } from "./hooks/useRecipes.ts";
import "@/app/css/reset.css";
import "@/app/css/main.css";
import {makeNewRecipe} from "@/shared/recipe.ts";

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
    const { recipes, createRecipe, updateRecipe, deleteRecipe, setRecipes } = useRecipes(user);
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

    const handleSave = async (content: string) => {
        if (!user)
            throw new Error("No user!");

        const savedRecipe = selectedRecipe
            ? await updateRecipe(selectedRecipe, content)
            : await createRecipe(content);

        if (!savedRecipe)
            throw new Error("Failed to save recipe!");

        setSelectedId(savedRecipe.id);
        setIsCreating(false);
    };

    const handleDelete = async () => {
        if (!selectedRecipe)
            throw new Error("No recipe selected!");
        await deleteRecipe(selectedRecipe.id);
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

    const libraryPage = (
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
                        recipe={selectedRecipe ?? makeNewRecipe()}
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                )}
            </div>
    );

    return (
        <main className="app-container">
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
        </main>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
