export class Step {
	readonly text: string;
	readonly ingredients?: string[];

	constructor(text: string, ingredients?: string[]) {
		this.text = text;
		this.ingredients = ingredients;
	}
}

export class Component {
	readonly name?: string;
	readonly steps: Step[];

	constructor(name: string | undefined, steps: Step[]) {
		this.name = name;
		this.steps = steps;
	}
}

export class Recipe {
	readonly id: number | null = null;
	readonly username: string | null = null;
	readonly title: string | null = null;
	readonly metadata: Record<string, string>;
	readonly components: Component[];

	constructor({
		id = null,
		username = null,
		title = null,
		metadata = {},
		components = [],
	}: {
		id?: number | null;
		username?: string | null;
		title?: string | null;
		metadata?: Record<string, string>;
		components?: Component[];
	}) {
		this.id = id;
		this.username = username || null;
		this.title = title;
		this.metadata = metadata;
		this.components = components;
	}

	get public(): boolean {
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

	get content(): string {
		return this.serialize();
	}

	static new(): Recipe {
		return new Recipe({});
	}

	static parse(recipeText: string): Recipe {
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
						const key = parts[0]!.trim(); // Fixed: Added '!'
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
			const trimmedContent = (content ?? "").trim(); // Fixed: Added '?? ""'

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

		return new Recipe({
			title: recipeTitle,
			metadata: metadata,
			components: finalComponents,
		});
	}

	serialize(): string {
		const lines: string[] = [];
		const metadata = { ...this.metadata };
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

		if (this.title) {
			lines.push(`= ${this.title}`);
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

		for (const [i, component] of this.components.entries()) {
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
}
