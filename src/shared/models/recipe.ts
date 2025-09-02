export interface User {
    readonly id: number
    readonly username: string
    readonly password_hash: string
}

export interface Step {
    readonly text: string
    readonly ingredients?: string[]
}

export interface Component {
    readonly name?: string
    readonly steps: Step[]
}

export interface NewRecipe {
    readonly content: string
}

export function makeNewRecipe(content: string = ''): NewRecipe {
    return {
        content: content,
    }
}

export interface ExistingRecipe extends NewRecipe {
    readonly id: string
    readonly username: string
    readonly user_id: number
    readonly title: string
    readonly category: string
    readonly is_public: boolean
}

export type Recipe = NewRecipe | ExistingRecipe

export function isExistingRecipe(recipe: Recipe): recipe is ExistingRecipe {
    return (recipe as ExistingRecipe).id !== undefined
}

export interface ParsedRecipe {
    readonly title?: string
    readonly metadata: Record<string, string>
    readonly components: readonly Component[]
}
