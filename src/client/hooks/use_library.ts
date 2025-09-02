import { useEffect, useState } from 'react'
import type { ExistingRecipe, User } from '@/shared/models/recipe.ts'

export function useLibrary(user: User | null) {
    const [recipes, setRecipes] = useState<ExistingRecipe[]>([])

    // Fetch recipes when the user logs in.
    useEffect(() => {
        if (!user) return
        fetch(`/api/users/${user.id}/recipes`).then(async (res) => {
            if (res.ok) {
                const data = await res.json()
                setRecipes(data)
            }
        })
    }, [user])

    const createRecipe = async (content: string): Promise<ExistingRecipe> => {
        if (!user) throw new Error('User not found')
        const res = await fetch(`/api/users/${user.id}/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: content,
        })
        if (!res.ok) throw new Error('Could not create recipe')
        const recipe: ExistingRecipe = await res.json()
        setRecipes((prev) => [...prev, recipe])
        return recipe
    }

    const updateRecipe = async (recipe: ExistingRecipe, content: string) => {
        if (!user) throw new Error('User not found')

        const res = await fetch(`/api/users/${user.id}/recipes/${recipe.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: content,
        })

        if (!res.ok) throw new Error('Could not create recipe')

        const updatedRecipe: ExistingRecipe = await res.json()
        setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? updatedRecipe : r)))

        return updatedRecipe
    }

    const deleteRecipe = async (id: string) => {
        if (!user) return
        const res = await fetch(`/api/users/${user.id}/recipes/${id}`, {
            method: 'DELETE',
        })
        if (res.ok) {
            setRecipes((prev) => prev.filter((r) => r.id !== id))
        }
    }

    return { recipes, setRecipes, createRecipe, updateRecipe, deleteRecipe }
}
