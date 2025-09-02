import { useMemo, useState } from 'react'
import { useLibrary } from '@/client/hooks/use_library.ts'
import type { User } from '@/shared/models/recipe.ts'
import { Sidebar } from '@/client/components/sidebar.tsx'
import { LibraryRecipe } from '@/client/components/library_recipe.tsx'

interface LibraryPageProps {
    user: User
}

export function Library({ user }: LibraryPageProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { recipes, createRecipe, updateRecipe, deleteRecipe } = useLibrary(user)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    const selectedRecipe = useMemo(
        () => recipes.find((r) => r.id === selectedId) || null,
        [recipes, selectedId],
    )

    const handleSelectRecipe = (id: string) => {
        setSelectedId(id)
        setIsCreating(false)
        setIsEditing(false)
    }

    const handleNewRecipe = () => {
        setSelectedId(null)
        setIsCreating(true)
        setIsEditing(true)
    }

    const handleEdit = () => setIsEditing(true)

    const handleCancelEdit = () => {
        setIsEditing(false)
        if (isCreating) {
            setIsCreating(false)
            setSelectedId(recipes.length > 0 ? recipes[0]!.id : null)
        }
    }

    const handleSave = async (content: string) => {
        const saved = selectedRecipe
            ? await updateRecipe(selectedRecipe, content)
            : await createRecipe(content)
        if (!saved) throw new Error('Failed to save recipe')
        setSelectedId(saved.id)
        setIsCreating(false)
        setIsEditing(false)
    }

    const handleDelete = async () => {
        if (!selectedRecipe) return
        await deleteRecipe(selectedRecipe.id)
        setSelectedId(null)
        setIsEditing(false)
    }

    const sessionKey = `${isCreating ? 'new' : (selectedId ?? 'none')}:${isEditing ? 'edit' : 'view'}`

    return (
        <div className="main-container">
            <Sidebar
                recipes={recipes}
                selectedId={selectedId}
                onSelectRecipe={handleSelectRecipe}
                onNewRecipe={handleNewRecipe}
            />

            <main>
                {recipes.length === 0 ? (
                    <p className="loading">Loading...</p>
                ) : selectedRecipe || isCreating ? (
                    <LibraryRecipe
                        key={sessionKey}
                        selectedRecipe={selectedRecipe}
                        isCreating={isCreating}
                        isEditing={isEditing}
                        onEdit={handleEdit}
                        onView={handleCancelEdit}
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                ) : null}
            </main>

            {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)}></div>}
        </div>
    )
}
