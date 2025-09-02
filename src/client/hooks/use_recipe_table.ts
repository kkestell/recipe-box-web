// hooks/use_recipe_table.ts
import { useEffect, useMemo, useState } from 'react'
import type { ExistingRecipe } from '@/shared/models/recipe.ts'

type PageItem = { type: 'page'; page: number } | { type: 'ellipsis'; left: number; right: number }

function getPageItems(current: number, total: number): PageItem[] {
    if (total <= 5) {
        return Array.from({ length: total }, (_, i) => ({ type: 'page', page: i + 1 }))
    }
    const items: PageItem[] = []
    items.push({ type: 'page', page: 1 })
    let start = Math.max(2, current - 1)
    let end = Math.min(total - 1, current + 1)
    while (end - start + 1 < 3) {
        if (start > 2) start--
        else if (end < total - 1) end++
        else break
    }
    if (start > 2) items.push({ type: 'ellipsis', left: 1, right: start })
    for (let p = start; p <= end; p++) items.push({ type: 'page', page: p })
    if (end < total - 1) items.push({ type: 'ellipsis', left: end, right: total })
    items.push({ type: 'page', page: total })
    return items
}

export function useRecipeTable() {
    const [recipes, setRecipes] = useState<ExistingRecipe[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const pageSize = 15

    // Filters
    const [searchDraft, setSearchDraft] = useState('')
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All Categories')
    const [cuisine, setCuisine] = useState('All Cuisines')

    useEffect(() => {
        setLoading(true)
        const params = new URLSearchParams({
            page: String(page),
            pageSize: String(pageSize),
        })
        if (search.trim()) params.set('q', search.trim())
        if (category && category !== 'All Categories') params.set('category', category)
        if (cuisine && cuisine !== 'All Cuisines') params.set('cuisine', cuisine)

        fetch(`/api/recipes?${params.toString()}`)
            .then((res) => res.json())
            .then(
                (data: {
                    recipes: ExistingRecipe[]
                    total: number
                    page: number
                    pageSize: number
                }) => {
                    setRecipes(data.recipes)
                    const ps = data.pageSize ?? pageSize
                    const tp = Math.max(1, Math.ceil(data.total / ps))
                    setTotalPages(tp)
                    if (data.page > tp) setPage(tp)
                },
            )
            .finally(() => setLoading(false))
    }, [page, search, category, cuisine])

    const pageItems = useMemo(() => getPageItems(page, totalPages), [page, totalPages])

    const goToPage = (p: number) => {
        if (p >= 1 && p <= totalPages) setPage(p)
    }

    const submitFilters = () => {
        setPage(1)
        setSearch(searchDraft.trim())
    }

    const changeCategory = (value: string) => {
        setCategory(value)
        setPage(1)
    }

    const changeCuisine = (value: string) => {
        setCuisine(value)
        setPage(1)
    }

    return {
        recipes,
        loading,
        page,
        totalPages,
        pageItems,
        goToPage,
        // filters
        searchDraft,
        setSearchDraft,
        submitFilters,
        category,
        changeCategory,
        cuisine,
        changeCuisine,
    }
}
