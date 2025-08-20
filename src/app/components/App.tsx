import { useState, useEffect, useMemo } from "react";
import { Header } from "./Header.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { Editor } from "./Editor.tsx";
import { LoginForm } from "./LoginForm.tsx";
import { SignupForm } from "./SignupForm.tsx";
import { Homepage } from "./Homepage.tsx";
import { Recipe } from "@/shared/recipe.ts";
import "@/app/css/reset.css";
import "@/app/css/main.css";

type User = { id: number; username: string };
type View = "home" | "login" | "signup";

export function App() {
    const [user, setUser] = useState<User | null>(null);
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [view, setView] = useState<View>("home");

    // Check for an active session when the app loads
    useEffect(() => {
        fetch("/api/me").then(async (res) => {
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        });
    }, []);

    // Fetch recipes when the user logs in
    useEffect(() => {
        if (!user) return;
        fetch(`/api/users/${user.id}/recipes`)
            .then((res) => res.json())
            .then((data) => setRecipes(data));
    }, [user]);

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
        if (!user) return;

        if (id === null) {
            const res = await fetch(`/api/users/${user.id}/recipes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            const newRecipe = await res.json();
            setRecipes([...recipes, newRecipe]);
            setSelectedId(newRecipe.id);
            setIsCreating(false);
        } else {
            await fetch(`/api/users/${user.id}/recipes/${id}`, {
                method: "PUT",
                body: content,
            });
            const updatedRecipe = Recipe.parse(content);
            (updatedRecipe as any).id = id;
            const updatedRecipes = recipes.map((r) =>
                r.id === id ? updatedRecipe : r,
            );
            setRecipes(updatedRecipes);
        }
    };

    const handleDelete = async (id: number) => {
        if (!user) return;
        await fetch(`/api/users/${user.id}/recipes/${id}`, {
            method: "DELETE",
        });
        setRecipes(recipes.filter((r) => r.id !== id));
        setSelectedId(null);
    };

    const handleLogout = async () => {
        await fetch("/api/logout", { method: "POST" });
        setUser(null);
        setRecipes([]);
        setSelectedId(null);
        setIsCreating(false);
        setView("home"); // Return to homepage on logout
    };

    const newRecipePlaceholder = useMemo(() => {
        const recipe = Recipe.parse("= Title\n\n# Step\n\n- Ingredient");
        (recipe as any).id = null;
        return recipe;
    }, []);

    // If a user is logged in, show the main application
    if (user) {
        return (
            <main className="app-container">
                <Header onLogout={handleLogout} />
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
                            recipe={selectedRecipe ?? newRecipePlaceholder}
                            onSave={handleSave}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </main>
        );
    }

    // If no user, show the appropriate auth screen
    switch (view) {
        case "login":
            return (
                <LoginForm
                    onSuccess={setUser}
                    switchToSignup={() => setView("signup")}
                    showHomepage={() => setView("home")}
                />
            );
        case "signup":
            return (
                <SignupForm
                    onSuccess={setUser}
                    switchToLogin={() => setView("login")}
                    showHomepage={() => setView("home")}
                />
            );
        default:
            return (
                <Homepage
                    showLogin={() => setView("login")}
                    showSignup={() => setView("signup")}
                />
            );
    }
}
