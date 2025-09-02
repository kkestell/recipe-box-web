// --- Parser Function ---

import type { Component, ParsedRecipe, Step } from '@/shared/models/recipe.ts'

export function parseRecipe(recipeText: string): [ParsedRecipe, string[]] {
    const errors: string[] = []

    // An empty input results in an empty recipe object.
    if (!recipeText.trim()) {
        return [{ title: undefined, metadata: {}, components: [] }, errors]
    }

    const lines = recipeText.trim().split('\n')
    const metadata: Record<string, string> = {}
    let contentLines = lines
    let recipeTitle: string | undefined

    // --- Metadata parsing ---
    if (lines[0]?.trim() === '---') {
        const endMetaIndex = lines.slice(1).indexOf('---') + 1
        if (endMetaIndex > 0) {
            const metaLines = lines.slice(1, endMetaIndex)
            contentLines = lines.slice(endMetaIndex + 1)
            for (const line of metaLines) {
                const parts = line.split(':')
                if (parts.length > 1) {
                    const key = parts[0]!.trim()
                    const value = parts.slice(1).join(':').trim()
                    metadata[key] = value
                }
            }
        }
    }

    const recipeNotes: string[] = []
    const finalComponents: Component[] = []
    let currentComponentName: string | undefined
    let currentComponentSteps: Step[] = []
    let currentStepText: string | undefined
    let currentStepIngredients: string[] = []

    // Finalizes the current step and adds it to the current component.
    const finalizeStep = () => {
        if (currentStepText) {
            const step: Step = {
                text: currentStepText,
                ingredients: currentStepIngredients.length > 0 ? currentStepIngredients : undefined,
            }
            currentComponentSteps.push(step)
        }
        currentStepText = undefined
        currentStepIngredients = []
    }

    // Finalizes the current component and adds it to the recipe.
    const finalizeComponent = () => {
        finalizeStep()
        if (currentComponentSteps.length > 0) {
            const component: Component = {
                name: currentComponentName,
                steps: currentComponentSteps,
            }
            finalComponents.push(component)
        }
        currentComponentName = undefined
        currentComponentSteps = []
    }

    const lineRegex = /^([=>+#-])\s*(.*)$/
    for (const line of contentLines) {
        const trimmedLine = line.trimStart()
        if (!trimmedLine) continue

        const match = trimmedLine.match(lineRegex)
        if (!match) continue

        const [, prefix, content] = match
        const trimmedContent = (content ?? '').trim()

        switch (prefix) {
            case '=':
                recipeTitle = trimmedContent
                break
            case '>':
                recipeNotes.push(trimmedContent)
                break
            case '+':
                finalizeComponent()
                currentComponentName = trimmedContent
                break
            case '#':
                finalizeStep()
                currentStepText = trimmedContent
                break
            case '-':
                if (currentStepText === undefined) {
                    // An ingredient must be part of a step.
                    errors.push(`Ingredient "${trimmedContent}" must belong to a step.`)
                } else {
                    currentStepIngredients.push(trimmedContent)
                }
                break
        }
    }

    finalizeComponent()

    if (recipeNotes.length > 0) {
        metadata['notes'] = recipeNotes.join('\n')
    }

    // Construct the recipe object with whatever was found.
    const recipe: ParsedRecipe = {
        title: recipeTitle,
        metadata: metadata,
        components: finalComponents,
    }

    // Return the parsed recipe and any errors that occurred.
    return [recipe, errors]
}

//
// /**
//  * Serializes a ParsedRecipe object into a raw string for storage.
//  * @param recipe The ParsedRecipe object.
//  * @returns A raw recipe content string.
//  */
// export function serializeRecipe(recipe: ParsedRecipe): string {
//     const lines: string[] = [];
//     const metadata = { ...recipe.metadata };
//     const notes = metadata["notes"];
//     delete metadata["notes"];
//
//     if (
//         metadata["category"] === "Uncategorized" &&
//         Object.keys(metadata).length === 1
//     ) {
//         delete metadata["category"];
//     }
//
//     if (Object.keys(metadata).length > 0) {
//         lines.push("---");
//         const sortedItems = Object.entries(metadata).sort(([keyA], [keyB]) =>
//             keyA.localeCompare(keyB),
//         );
//
//         const maxKeyLength = Math.max(...sortedItems.map(([key]) => key.length));
//
//         for (const [key, value] of sortedItems) {
//             if (value !== undefined && value !== null) {
//                 const padding = " ".repeat(maxKeyLength - key.length);
//                 lines.push(`${key}:${padding} ${value}`);
//             }
//         }
//         lines.push("---", "");
//     }
//
//     if (recipe.title) {
//         lines.push(`= ${recipe.title}`);
//     }
//
//     if (notes) {
//         lines.push("");
//         lines.push(
//             ...notes
//                 .trim()
//                 .split("\n")
//                 .map((line) => `> ${line.trim()}`),
//         );
//     }
//
//     for (const component of recipe.components) {
//         if (lines.length > 0 && lines[lines.length - 1] !== "") {
//             lines.push("");
//         }
//
//         if (component.name) {
//             lines.push(`+ ${component.name}`);
//         }
//
//         if (component.steps.length > 0) {
//             if (component.name) {
//                 lines.push("");
//             }
//
//             for (const [j, step] of component.steps.entries()) {
//                 lines.push(`# ${step.text}`);
//                 if (step.ingredients) {
//                     lines.push("");
//                     lines.push(...step.ingredients.map((ing) => `- ${ing}`));
//                 }
//                 if (j < component.steps.length - 1) {
//                     lines.push("");
//                 }
//             }
//         }
//     }
//
//     return lines.join("\n") + "\n";
// }
