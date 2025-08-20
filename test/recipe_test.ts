import { expect, test, describe } from "bun:test";
import { Recipe, Step, Component } from "@/shared/recipe.ts";

test("2 + 2", () => {
	expect(2 + 2).toBe(4);
});

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

describe("Recipe.parse", () => {
	test("should parse a recipe with full metadata, notes, and multiple components", () => {
		const recipe = Recipe.parse(fullRecipeText);

		expect(recipe.title).toBe("Classic Spaghetti Carbonara");
		expect(recipe.metadata).toEqual({
			category: "Dinner",
			cook_time: "30",
			cuisine: "Italian",
			favorite: "true",
			prep_time: "15",
			source: "Grandma's cookbook",
			yields: "4 servings",
			notes:
				"A classic Roman pasta dish.\nUse guanciale for the most authentic flavor.",
		});
		expect(recipe.components.length).toBe(2);

		// First component
		expect(recipe.components[0]?.name).toBe("Prepare Ingredients");
		expect(recipe.components[0]?.steps.length).toBe(2);
		expect(recipe.components[0]?.steps[0]?.text).toBe("Cook the pasta");
		expect(recipe.components[0]?.steps[0]?.ingredients).toEqual([
			"1 lb spaghetti",
			"Salt for water",
		]);

		// Second component
		expect(recipe.components[1]?.name).toBe("Cook");
		expect(recipe.components[1]?.steps.length).toBe(2);
		expect(recipe.components[1]?.steps[0]?.text).toBe("Render the guanciale");
		expect(recipe.components[1]?.steps[0]?.ingredients).toEqual([
			"4 oz guanciale, diced",
		]);
		expect(recipe.components[1]?.steps[1]?.text).toBe("Combine everything");
		expect(recipe.components[1]?.steps[1]?.ingredients).toBeUndefined();
	});

	test("should parse a simple recipe without metadata or named components", () => {
		const recipe = Recipe.parse(simpleRecipeText);

		expect(recipe.title).toBe("Simple Salad");
		expect(recipe.metadata).toEqual({});
		expect(recipe.components.length).toBe(1);
		expect(recipe.components[0]?.name).toBeUndefined();
		expect(recipe.components[0]?.steps.length).toBe(1);
		expect(recipe.components[0]?.steps[0]?.text).toBe(
			"Combine greens and dressing",
		);
		expect(recipe.components[0]?.steps[0]?.ingredients).toEqual([
			"1 bag mixed greens",
			"2 tbsp olive oil",
			"1 tbsp lemon juice",
		]);
	});

	test("should throw an error for empty input", () => {
		expect(() => Recipe.parse("")).toThrow("Cannot parse an empty recipe.");
	});

	test("should throw an error if title is missing", () => {
		const text = `+ My Component\n# Step 1`;
		expect(() => Recipe.parse(text)).toThrow("No recipe title.");
	});

	test("should throw an error if content is missing", () => {
		const text = `= My Title`;
		expect(() => Recipe.parse(text)).toThrow(
			"Recipe content is missing or invalid.",
		);
	});

	test("should throw an error for an ingredient without a step", () => {
		const text = `= Bad Recipe\n- 1 cup flour`;
		expect(() => Recipe.parse(text)).toThrow(
			"Ingredients must belong to a step.",
		);
	});
});

describe("Recipe.serialize", () => {
	test("should perform a round-trip parse and serialization", () => {
		const recipe = Recipe.parse(fullRecipeText);
		const serialized = recipe.serialize();
		// The padding in the metadata can change, so we compare a re-parsed version
		const reParsed = Recipe.parse(serialized);
		expect(reParsed).toEqual(recipe);
	});

	test("should serialize a programmatically created recipe", () => {
		const recipe = new Recipe({
			title: "My Recipe",
			metadata: { category: "Dessert", prep_time: "10" },
			components: [
				new Component(undefined, [
					new Step("Mix ingredients", ["1 cup sugar", "2 eggs"]),
					new Step("Bake"),
				]),
			],
		});

		const expected = `---
category:  Dessert
prep_time: 10
---

= My Recipe

# Mix ingredients

- 1 cup sugar
- 2 eggs

# Bake
`;
		expect(recipe.serialize()).toBe(expected);
	});

	test("should omit 'Uncategorized' metadata if it's the only one", () => {
		const recipe = new Recipe({
			title: "Test",
			metadata: { category: "Uncategorized" },
			components: [new Component(undefined, [new Step("Do something")])],
		});
		const expected = `= Test

# Do something
`;
		expect(recipe.serialize()).toBe(expected);
	});
});

describe("Recipe properties", () => {
	const recipe = Recipe.parse(fullRecipeText);

	test("should return correct values for time properties", () => {
		expect(recipe.prepTime).toBe(15);
		expect(recipe.cookTime).toBe(30);
	});

	test("should return undefined for invalid or missing time properties", () => {
		const r = new Recipe({
			title: "Test",
			metadata: { prep_time: "abc", cook_time: "20 min" },
			components: [new Component(undefined, [new Step("s")])],
		});
		expect(r.prepTime).toBeUndefined();
		expect(r.cookTime).toBeUndefined();
		expect(r.yields).toBeUndefined();
	});

	test("should return correct string properties", () => {
		expect(recipe.favorite).toBe(true);
		expect(recipe.yields).toBe("4 servings");
		expect(recipe.cuisine).toBe("Italian");
		expect(recipe.source).toBe("Grandma's cookbook");
		expect(recipe.notes).toBe(
			"A classic Roman pasta dish.\nUse guanciale for the most authentic flavor.",
		);
	});

	test("should return category with default", () => {
		expect(recipe.category).toBe("Dinner");
		const simpleRecipe = Recipe.parse(simpleRecipeText);
		expect(simpleRecipe.category).toBe("Uncategorized");
	});

	test("should return serialized content for the content property", () => {
		const recipe = Recipe.parse(simpleRecipeText);
		expect(recipe.content).toBe(recipe.serialize());
	});
});
