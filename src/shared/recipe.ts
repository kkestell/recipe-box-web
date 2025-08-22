/**
 * Represents a single instruction in a recipe component.
 */
export class Step {
    readonly text: string;
    readonly ingredients?: string[];

    constructor(text: string, ingredients?: string[]) {
        this.text = text;
        this.ingredients = ingredients;
    }
}

/**
 * Represents a named section of a recipe, like "Dough" or "Topping".
 */
export class Component {
    readonly name?: string;
    readonly steps: Step[];

    constructor(name: string | undefined, steps: Step[]) {
        this.name = name;
        this.steps = steps;
    }
}

/**
 * Represents a recipe as it is stored in the database.
 * This is a simple data-transfer object.
 */
export interface Recipe {
    readonly id: number;
    readonly user_id: number;
    readonly title: string;
    readonly category: string;
    readonly is_public: boolean;
    readonly content: string;
}

export type NewRecipe = Omit<Recipe, 'id'>;

/**
 * Represents a recipe with its content parsed into structured components and steps.
 * This class contains the logic for accessing metadata properties.
 */
export class ParsedRecipe {
    readonly title: string;
    readonly metadata: Record<string, string>;
    readonly components: Component[];

    constructor({
        title,
        metadata = {},
        components = [],
    }: {
        title: string;
        metadata?: Record<string, string>;
        components?: Component[];
    }) {
        this.title = title;
        this.metadata = metadata;
        this.components = components;
    }

    get is_public(): boolean {
        return this.metadata["public"] === "true";
    }

    get draft(): boolean {
        return this.metadata["draft"] === "true";
    }

    get favorite(): boolean {
        return this.metadata["favorite"] === "true";
    }

    get notes(): string | undefined {
        return this.metadata["notes"];
    }

    get prepTime(): number | undefined {
        const val = this.metadata["prep_time"];
        if (val && /^\d+$/.test(val)) {
            return parseInt(val, 10);
        }
        return undefined;
    }

    get cookTime(): number | undefined {
        const val = this.metadata["cook_time"];
        if (val && /^\d+$/.test(val)) {
            return parseInt(val, 10);
        }
        return undefined;
    }

    get yields(): string | undefined {
        return this.metadata["yields"];
    }

    get category(): string {
        return this.metadata["category"] ?? "Uncategorized";
    }

    get cuisine(): string | undefined {
        return this.metadata["cuisine"];
    }

    get source(): string | undefined {
        return this.metadata["source"];
    }
}

/**
 * Parses a raw string into a structured ParsedRecipe object.
 * @param recipeText The raw recipe content string.
 * @returns A ParsedRecipe object.
 */
export function parseRecipe(recipeText: string): ParsedRecipe {
    if (!recipeText.trim()) {
        throw new Error("Cannot parse an empty recipe.");
    }

    const lines = recipeText.trim().split("\n");
    let metadata: Record<string, string> = {};
    let contentLines = lines;
    let recipeTitle: string | undefined;

    if (lines[0]?.trim() === "---") {
        const endMetaIndex = lines.slice(1).indexOf("---") + 1;
        if (endMetaIndex > 0) {
            const metaLines = lines.slice(1, endMetaIndex);
            contentLines = lines.slice(endMetaIndex + 1);
            for (const line of metaLines) {
                const parts = line.split(":");
                if (parts.length > 1) {
                    const key = parts[0]!.trim();
                    const value = parts.slice(1).join(":").trim();
                    metadata[key] = value;
                }
            }
        }
    }

    const recipeNotes: string[] = [];
    const finalComponents: Component[] = [];
    let currentComponentName: string | undefined;
    let currentComponentSteps: Step[] = [];
    let currentStepText: string | undefined;
    let currentStepIngredients: string[] = [];

    const finalizeStep = () => {
        if (currentStepText) {
            const step = new Step(
                currentStepText,
                currentStepIngredients.length > 0
                    ? [...currentStepIngredients]
                    : undefined,
            );
            currentComponentSteps.push(step);
        }
        currentStepText = undefined;
        currentStepIngredients = [];
    };

    const finalizeComponent = () => {
        finalizeStep();
        if (currentComponentSteps.length > 0) {
            const component = new Component(currentComponentName, [
                ...currentComponentSteps,
            ]);
            finalComponents.push(component);
        }
        currentComponentName = undefined;
        currentComponentSteps = [];
    };

    const lineRegex = /^([=>+#-])\s*(.*)$/;
    for (const line of contentLines) {
        const trimmedLine = line.trimStart();
        if (!trimmedLine) continue;

        const match = trimmedLine.match(lineRegex);
        if (!match) continue;

        const [, prefix, content] = match;
        const trimmedContent = (content ?? "").trim();

        switch (prefix) {
            case "=":
                recipeTitle = trimmedContent;
                break;
            case ">":
                recipeNotes.push(trimmedContent);
                break;
            case "+":
                finalizeComponent();
                currentComponentName = trimmedContent;
                break;
            case "#":
                finalizeStep();
                currentStepText = trimmedContent;
                break;
            case "-":
                if (currentStepText === undefined) {
                    throw new Error("Ingredients must belong to a step.");
                }
                currentStepIngredients.push(trimmedContent);
                break;
        }
    }

    finalizeComponent();

    if (recipeNotes.length > 0) {
        metadata["notes"] = recipeNotes.join("\n");
    }

    if (!recipeTitle) {
        throw new Error("No recipe title.");
    }

    if (finalComponents.length === 0) {
        throw new Error("Recipes need at least one step.");
    }

    return new ParsedRecipe({
        title: recipeTitle,
        metadata: metadata,
        components: finalComponents,
    });
}

/**
 * Serializes a ParsedRecipe object into a raw string for storage.
 * @param recipe The ParsedRecipe object.
 * @returns A raw recipe content string.
 */
export function serializeRecipe(recipe: ParsedRecipe): string {
    const lines: string[] = [];
    const metadata = { ...recipe.metadata };
    const notes = metadata["notes"];
    delete metadata["notes"];

    if (
        metadata["category"] === "Uncategorized" &&
        Object.keys(metadata).length === 1
    ) {
        delete metadata["category"];
    }

    if (Object.keys(metadata).length > 0) {
        lines.push("---");
        const sortedItems = Object.entries(metadata).sort(([keyA], [keyB]) =>
            keyA.localeCompare(keyB),
        );

        const maxKeyLength = Math.max(...sortedItems.map(([key]) => key.length));

        for (const [key, value] of sortedItems) {
            if (value !== undefined && value !== null) {
                const padding = " ".repeat(maxKeyLength - key.length);
                lines.push(`${key}:${padding} ${value}`);
            }
        }
        lines.push("---", "");
    }

    if (recipe.title) {
        lines.push(`= ${recipe.title}`);
    }

    if (notes) {
        lines.push("");
        lines.push(
            ...notes
                .trim()
                .split("\n")
                .map((line) => `> ${line.trim()}`),
        );
    }

    for (const component of recipe.components) {
        if (lines.length > 0 && lines[lines.length - 1] !== "") {
            lines.push("");
        }

        if (component.name) {
            lines.push(`+ ${component.name}`);
        }

        if (component.steps.length > 0) {
            if (component.name) {
                lines.push("");
            }

            for (const [j, step] of component.steps.entries()) {
                lines.push(`# ${step.text}`);
                if (step.ingredients) {
                    lines.push("");
                    lines.push(...step.ingredients.map((ing) => `- ${ing}`));
                }
                if (j < component.steps.length - 1) {
                    lines.push("");
                }
            }
        }
    }

    return lines.join("\n") + "\n";
}
