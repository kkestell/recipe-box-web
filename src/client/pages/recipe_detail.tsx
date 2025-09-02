import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ExistingRecipe } from '@/shared/models/recipe.ts'
import { parseRecipe } from '@/shared/serialization.ts'
import { RecipeView } from '@/client/components/recipe_view.tsx'

export function RecipeDetail() {
    const { id } = useParams<{ id: string }>()
    const [recipe, setRecipe] = useState<ExistingRecipe | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        setLoading(true)

        fetch(`/api/recipes/${id}`)
            .then(async (res) => {
                if (!res.ok) {
                    const msg =
                        res.status === 404
                            ? 'Recipe not found.'
                            : res.status === 401
                              ? 'You do not have access to this recipe.'
                              : 'Failed to load recipe.'
                    throw new Error(msg)
                }
                return res.json() as Promise<ExistingRecipe>
            })
            .then((data) => setRecipe(data))
            .catch((e: Error) => alert(e.message))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <main>
                <p>Loading...</p>
            </main>
        )
    }

    if (recipe) {
        const [parsed, errors] = parseRecipe(recipe.content)
        if (errors.length > 0) {
            alert('Error parsing recipe.')
            return <main />
        }
        return (
            <main className="recipe-page">
                <div className="content-header">
                    <div className="content-header-left"></div>
                    <h2>{parsed.title ?? 'Untitled Recipe'}</h2>
                    <div className="content-header-right">
                        <button>
                            <a
                                href={`/api/recipes/${recipe.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="button"
                            >
                                Print (PDF)
                            </a>
                        </button>
                    </div>
                </div>
                <div className="content-body">
                    <RecipeView recipe={parsed} />
                </div>
            </main>
        )
    }

    return <main />
}
