export function Help() {
    return (
        <main className="page content">
            <h1>Help</h1>

            <h2>Recipe Format</h2>

            <p>
                The Recipe Box format is a simple, structured way to write recipes in plain text
                files that&apos;s easy for both humans and computers to read and write. A recipe
                consists of a title, optional metadata and notes, and a series of steps, which can
                be grouped into named components.
            </p>

            <pre>
                <code>
                    {`= Classic Brownies

> These brownies are rich and fudgy.

# Melt butter and mix with sugar.

- 1 cup butter
- 2 cups sugar

# Beat in eggs, one at a time.

- 4 eggs

# Fold in cocoa powder and flour.

- 3/4 cup cocoa powder
- 1 cup flour

# Bake 25 minutes at 350°F.`}
                </code>
            </pre>

            <h3>Title</h3>

            <p>
                The recipe title is prefixed with an equals sign (<code>=</code>). It should
                immediately follow any metadata (if present).
            </p>

            <h3>Notes</h3>

            <p>
                Notes are prefixed with a greater-than sign (<code>&gt;</code>) and are listed
                immediately following the title. You can have multiple lines of notes, each starting
                with a <code>&gt;</code>.
            </p>

            <h3>Ingredients</h3>

            <p>
                Ingredients are prefixed with a dash (<code>-</code>) and are listed immediately
                following the step they belong to.
            </p>

            <h3>Steps</h3>

            <p>
                Steps are marked with a hash symbol (<code>#</code>).
            </p>

            <h3>Multiple Components</h3>

            <p>
                For more complex recipes, you can use a plus (<code>+</code>) prefix to create named
                components.
            </p>

            <pre>
                <code>
                    {`= Chicken Parmesan

+ Chicken

# Pound chicken breasts thin.

- 4 chicken breasts

# Dip in eggs, then breadcrumbs.

- 2 eggs
- 1 cup breadcrumbs

# Pan fry until golden.

+ Sauce

# Sauté garlic in olive oil until fragrant.

- 3 cloves garlic
- 1 tbsp olive oil

# Add crushed tomatoes and oregano, then simmer.

- 1 can crushed tomatoes
- 1 tsp oregano`}
                </code>
            </pre>

            <h3>Metadata</h3>

            <p>
                Recipe metadata uses YAML frontmatter format with <code>lower_snake_case</code>{' '}
                keys.
            </p>

            <pre>
                <code>
                    {`---
prep_time: 20 minutes
cook_time: 45 minutes
servings:  6
---`}
                </code>
            </pre>

            <p>Metadata must appear at the very beginning of your recipe file.</p>
        </main>
    )
}
