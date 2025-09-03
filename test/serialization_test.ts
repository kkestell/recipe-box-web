import { describe, expect, test } from "bun:test";
import { parseRecipe } from "@/shared/serialization.ts";

const fullRecipeText = `---
category:  Dinner
cook_time: 30
cuisine:   Italian
favorite:  true
prep_time: 15
source:    Grandma's cookbook
yields:    4 servings
---

= Classic Spaghetti Carbonara

> A classic Roman pasta dish.
> Use guanciale for the most authentic flavor.

+ Prepare Ingredients

# Cook the pasta

- 1 lb spaghetti
- Salt for water

# Prepare the egg mixture

- 4 large egg yolks
- 1/2 cup grated Pecorino Romano cheese
- Black pepper

+ Cook

# Render the guanciale

- 4 oz guanciale, diced

# Combine everything
`;

const simpleRecipeText = `= Simple Salad

# Combine greens and dressing

- 1 bag mixed greens
- 2 tbsp olive oil
- 1 tbsp lemon juice
`;

describe("parseRecipe", () => {
    test("should parse a recipe with metadata, notes, and multiple components", () => {
        const [recipe, errors] = parseRecipe(fullRecipeText);

        expect(errors).toEqual([]);
        expect(recipe.title).toBe("Classic Spaghetti Carbonara");
        expect(recipe.notes).toEqual([
            "A classic Roman pasta dish.",
            "Use guanciale for the most authentic flavor.",
        ]);
        expect(recipe.metadata).toEqual({
            category: "Dinner",
            cook_time: "30",
            cuisine: "Italian",
            favorite: "true",
            prep_time: "15",
            source: "Grandma's cookbook",
            yields: "4 servings",
        });

        expect(recipe.components.length).toBe(2);

        // First component
        const [component1] = recipe.components;
        expect(component1?.name).toBe("Prepare Ingredients");
        expect(component1?.steps.length).toBe(2);
        expect(component1?.steps[0]?.text).toBe("Cook the pasta");
        expect(component1?.steps[0]?.ingredients).toEqual([
            "1 lb spaghetti",
            "Salt for water",
        ]);

        // Second component
        const [, component2] = recipe.components;
        expect(component2?.name).toBe("Cook");
        expect(component2?.steps[1]?.text).toBe("Combine everything");
        expect(component2?.steps[1]?.ingredients).toBeUndefined();
    });

    test("should parse a simple recipe without metadata or named components", () => {
        const [recipe, errors] = parseRecipe(simpleRecipeText);

        expect(errors).toEqual([]);
        expect(recipe.title).toBe("Simple Salad");
        expect(recipe.metadata).toEqual({});
        expect(recipe.components.length).toBe(1);

        const [component] = recipe.components;
        expect(component?.name).toBeUndefined();
        expect(component?.steps.length).toBe(1);
        expect(component?.steps[0]?.text).toBe("Combine greens and dressing");
        expect(component?.steps[0]?.ingredients).toEqual([
            "1 bag mixed greens",
            "2 tbsp olive oil",
            "1 tbsp lemon juice",
        ]);
    });

    test("should handle empty or whitespace-only input", () => {
        const [recipe, errors] = parseRecipe("   \n   ");
        expect(errors).toEqual([]);
        expect(recipe).toEqual({
            title: undefined,
            notes: [],
            metadata: {},
            components: [],
        });
    });

    test("should parse a recipe with no title", () => {
        const text = `+ My Component\n# Step 1`;
        const [recipe, errors] = parseRecipe(text);

        expect(errors).toEqual([]);
        expect(recipe.title).toBeUndefined();
        expect(recipe.components.length).toBe(1);
        expect(recipe.components[0]?.name).toBe("My Component");
    });

    test("should parse a recipe with no steps", () => {
        const text = `= My Title`;
        const [recipe, errors] = parseRecipe(text);

        expect(errors).toEqual([]);
        expect(recipe.title).toBe("My Title");
        expect(recipe.components).toEqual([]);
    });

    test("should return an error for an ingredient without a step", () => {
        const text = `= Bad Recipe\n- 1 cup flour`;
        const [recipe, errors] = parseRecipe(text);

        expect(recipe.title).toBe("Bad Recipe");
        expect(errors.length).toBe(1);
        expect(errors[0]).toBe('Ingredient "1 cup flour" must belong to a step.');
    });
});