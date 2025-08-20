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

type View = "home" | "login" | "signup";

export function App() {
    const { user, setUser, logout } = useAuth();
    const { recipes, saveRecipe, deleteRecipe, setRecipes } = useRecipes(user);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [view, setView] = useState<View>("home");

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

    const handleLogout = () => {
        logout();
        setRecipes([]); // Clear recipes immediately on logout
        setSelectedId(null);
        setIsCreating(false);
        setView("home");
    };

    const newRecipePlaceholder = useMemo(() => {
        const recipe = Recipe.parse("= Title\n\n# Step\n\n- Ingredient");
        (recipe as any).id = null;
        return recipe;
    }, []);

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