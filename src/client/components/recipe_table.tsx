import { Link } from 'react-router-dom'
import { parseRecipe } from '@/shared/serialization.ts'
import { useRecipeTable } from '@/client/hooks/use_recipe_table.ts'
import { useEffect, useState } from 'react'

export function RecipeTable() {
    const {
        recipes,
        loading,
        page,
        totalPages,
        pageItems,
        goToPage,
        searchDraft,
        setSearchDraft,
        submitFilters,
        category,
        changeCategory,
        cuisine,
        changeCuisine,
    } = useRecipeTable()

    const [categories, setCategories] = useState<string[]>(['All Categories'])
    const [cuisines, setCuisines] = useState<string[]>(['All Cuisines'])

    useEffect(() => {
        ;(async () => {
            const [catsRes, cuisRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/cuisines'),
            ])
            if (catsRes.ok) {
                const data: string[] = await catsRes.json()
                setCategories(['All Categories', ...data])
            }
            if (cuisRes.ok) {
                const data: string[] = await cuisRes.json()
                setCuisines(['All Cuisines', ...data])
            }
        })()
    }, [])

    return (
        <>
            <form
                className="filter-container"
                onSubmit={(e) => {
                    e.preventDefault()
                    submitFilters()
                }}
            >
                <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                />
                <select value={category} onChange={(e) => changeCategory(e.target.value)}>
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <select value={cuisine} onChange={(e) => changeCuisine(e.target.value)}>
                    {cuisines.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
                <button type="submit">Search</button>
            </form>

            <div className="table-container">
                <table className="recipe-table">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Cuisine</th>
                            <th>User</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="loading">
                                    Loading...
                                </td>
                            </tr>
                        ) : recipes.length === 0 ? (
                            <tr>
                                <td colSpan={4}>No recipes found</td>
                            </tr>
                        ) : (
                            recipes.map((recipe) => {
                                const [parsed, errors] = parseRecipe(recipe.content)
                                if (errors.length > 0) {
                                    return (
                                        <tr key={`err-${recipe.id}`}>
                                            <td colSpan={4}>Error parsing recipe</td>
                                        </tr>
                                    )
                                }
                                return (
                                    <tr key={recipe.id}>
                                        <td>
                                            <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                                        </td>
                                        <td>{parsed.metadata.category ?? 'Uncategorized'}</td>
                                        <td>{parsed.metadata.cuisine ?? 'Unknown'}</td>
                                        <td>{recipe.username}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button disabled={page === 1} onClick={() => goToPage(page - 1)}>
                    Previous
                </button>

                {pageItems.map((item, idx) =>
                    item.type === 'ellipsis' ? (
                        <span
                            key={`ellipsis-${idx}-${item.left}-${item.right}`}
                            className="ellipsis"
                        >
                            ...
                        </span>
                    ) : (
                        <button
                            key={`page-${item.page}`}
                            className={page === item.page ? 'active' : ''}
                            onClick={() => goToPage(item.page)}
                        >
                            {item.page}
                        </button>
                    ),
                )}

                <button disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
                    Next
                </button>
            </div>
        </>
    )
}
