import type { ParsedRecipe } from '@/shared/models/recipe.ts'
import React, { useState } from 'react'

type RecipeViewProps = {
    recipe: ParsedRecipe
}

const FRACTION_SLASH_REGEX = /(?<=\d)\/(?=\d)/g
const MULTIPLICATION_SIGN_REGEX = /(?<=\d)x(?=\d)/g
const EN_DASH_REGEX = /(?<=\d)-(?=\d)/g

function fancy(text: string | null | undefined): string {
    if (!text || !text.trim()) return ''

    const narrowNbsp = '\u202f'
    const fractionSlash = '\u2044'
    const multiplicationSign = '\u00d7'
    const enDash = '\u2013'

    let processed = text.replace(/°F/g, `${narrowNbsp}°F`)
    processed = processed.replace(FRACTION_SLASH_REGEX, fractionSlash)
    processed = processed.replace(MULTIPLICATION_SIGN_REGEX, multiplicationSign)
    processed = processed.replace(EN_DASH_REGEX, enDash)

    return processed
}

function toTitleCase(str: string) {
    return str
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export function RecipeView({ recipe }: RecipeViewProps) {
    const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({})

    const handleStepToggle = (id: string) => {
        setCompletedSteps((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    return (
        <div className="recipe-container">
            <div className="recipe">
                {recipe.title && <h1>{recipe.title}</h1>}

                <dl className="recipe-meta">
                    {Object.entries(recipe.metadata).map(([key, value]) => (
                        <React.Fragment key={key}>
                            <dt>{toTitleCase(key)}</dt>
                            <dd>{value}</dd>
                        </React.Fragment>
                    ))}
                </dl>

                {/* FIXME: Notes */}

                {recipe.components.map((component, componentIndex) => (
                    <div className="recipe-component" key={`component-${componentIndex}`}>
                        {component.name && <h3>{component.name}</h3>}
                        <div className="recipe-steps">
                            {component.steps.map((step, stepIndex) => {
                                const stepId = `comp-${componentIndex}-step-${stepIndex}`
                                const isCompleted = !!completedSteps[stepId]

                                return (
                                    <div
                                        className={`recipe-step ${isCompleted ? 'completed' : ''}`}
                                        key={stepId}
                                    >
                                        <div className="recipe-step-number">
                                            <span>{stepIndex + 1}</span>
                                            <div className="form-check">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={isCompleted}
                                                    onChange={() => handleStepToggle(stepId)}
                                                />
                                            </div>
                                        </div>
                                        <p>{fancy(step.text)}</p>
                                        {step.ingredients && step.ingredients.length > 0 && (
                                            <ul>
                                                {step.ingredients.map(
                                                    (ingredient, ingredientIndex) => {
                                                        const ingredientId = `${stepId}-ing-${ingredientIndex}`
                                                        return (
                                                            <li key={ingredientId}>
                                                                <div className="form-check">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        id={ingredientId}
                                                                        key={`${ingredientId}-${isCompleted}`}
                                                                        defaultChecked={isCompleted}
                                                                    />
                                                                    <label
                                                                        className="form-check-label"
                                                                        htmlFor={ingredientId}
                                                                    >
                                                                        {fancy(ingredient)}
                                                                    </label>
                                                                </div>
                                                            </li>
                                                        )
                                                    },
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
