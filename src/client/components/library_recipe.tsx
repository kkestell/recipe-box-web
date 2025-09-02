import { useMemo, useState } from 'react'
import type { ExistingRecipe } from '@/shared/models/recipe.ts'
import { parseRecipe } from '@/shared/serialization.ts'
import { RecipeView } from '@/client/components/recipe_view.tsx'
import { RecipeEditor } from '@/client/components/recipe_editor.tsx'

type LibraryRecipeProps = {
    selectedRecipe: ExistingRecipe | null
    isCreating: boolean
    isEditing: boolean
    onEdit: () => void
    onView: () => void
    onSave: (content: string) => void
    onDelete: () => void
}

export function LibraryRecipe({
    selectedRecipe,
    isCreating,
    isEditing,
    onEdit,
    onView,
    onSave,
    onDelete,
}: LibraryRecipeProps) {
    const baselineContent = isCreating ? '' : (selectedRecipe?.content ?? '')
    const [content, setContent] = useState<string>(baselineContent)

    const { editorTitle, editorErrors } = useMemo(() => {
        const [parsed, errors] = parseRecipe(content)
        return {
            editorTitle: parsed.title ?? 'Untitled Recipe',
            editorErrors: errors,
        }
    }, [content])

    const isDirty = content.trim() !== baselineContent.trim()
    const canSave = isDirty && (content.trim().length === 0 || editorErrors.length === 0)

    const parsedView = useMemo(() => {
        if (!selectedRecipe) return null
        const [parsed] = parseRecipe(selectedRecipe.content)
        return parsed
    }, [selectedRecipe])

    const handlePrint = () => {
        if (!selectedRecipe) return
        window.open(`/api/recipes/${selectedRecipe.id}/pdf`, '_blank', 'noopener')
    }

    return isEditing ? (
        <>
            <div className="content-header">
                <div className="content-header-left">
                    <button className="back" onClick={onView}>
                        ←
                    </button>
                    <button className="save" onClick={() => onSave(content)} disabled={!canSave}>
                        Save
                    </button>
                </div>

                <h2>{isDirty ? `* ${editorTitle}` : editorTitle}</h2>

                <div className="content-header-right">
                    {!!selectedRecipe && !isCreating && (
                        <button className="delete" onClick={onDelete}>
                            Delete
                        </button>
                    )}
                </div>
            </div>

            <div className="content-body">
                <RecipeEditor
                    value={content}
                    onChange={(next) => {
                        setContent(next)
                    }}
                />
                {editorErrors.length > 0 && (
                    <p className="recipe-editor-error">{editorErrors.join('\n')}</p>
                )}
            </div>
        </>
    ) : (
        <>
            {parsedView && (
                <div className="content-header">
                    <div className="content-header-left">
                        <button onClick={onEdit}>Edit</button>
                    </div>

                    <h2>{parsedView.title}</h2>

                    <div className="content-header-right">
                        <button onClick={handlePrint}>Print (PDF)</button>
                    </div>
                </div>
            )}

            <div className="content-body">{parsedView && <RecipeView recipe={parsedView} />}</div>
        </>
    )
}
