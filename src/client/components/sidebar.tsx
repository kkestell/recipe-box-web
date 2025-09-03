import { useState } from 'react'
import type { ExistingRecipe } from '@/shared/models/recipe.ts'

type SidebarProps = {
    recipes: ExistingRecipe[]
    selectedId: string | null
    onSelectRecipe: (id: string) => void
    onNewRecipe: () => void
}

export function Sidebar({ recipes, selectedId, onSelectRecipe, onNewRecipe }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredRecipes = recipes
        .filter((recipe) => recipe.title?.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))

    const recipesByCategory = filteredRecipes.reduce(
        (acc, recipe) => {
            const category = recipe.category || 'Uncategorized'
            if (!acc[category]) acc[category] = []
            acc[category].push(recipe)
            return acc
        },
        {} as Record<string, ExistingRecipe[]>,
    )

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        className="add-btn"
                        onClick={() => {
                            onNewRecipe()
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <title>New Recipe</title>
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="sidebar-content">
                {Object.entries(recipesByCategory)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([category, recipesInCategory]) => (
                        <div className="category" key={category}>
                            <h6>{category}</h6>
                            <ul>
                                {recipesInCategory.map((recipe) => (
                                    <li
                                        key={recipe.id}
                                        className={
                                            recipe.id === selectedId ? 'selected' : undefined
                                        }
                                    >
                                        <a
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                onSelectRecipe(recipe.id)
                                            }}
                                        >
                                            {recipe.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
            </div>
        </aside>
    )
}
