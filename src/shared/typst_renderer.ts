import type { ParsedRecipe, Step } from '@/shared/models/recipe.ts'

export class TypstRenderer {
    private static readonly FRACTION_SLASH_REGEX = /(?<=\d)\/(?=\d)/g
    private static readonly MULTIPLICATION_SIGN_REGEX = /(?<=\d)x(?=\d)/g
    private static readonly EN_DASH_REGEX = /(?<=\d)-(?=\d)/g

    private static fancy(text: string | null | undefined): string {
        if (!text || !text.trim()) return ''

        const narrowNbsp = '\u202f'
        const fractionSlash = '\u2044'
        const multiplicationSign = '\u00d7'
        const enDash = '\u2013'

        let processed = text.replace('°F', `${narrowNbsp}°F`)
        processed = processed.replace(TypstRenderer.FRACTION_SLASH_REGEX, fractionSlash)
        processed = processed.replace(TypstRenderer.MULTIPLICATION_SIGN_REGEX, multiplicationSign)
        processed = processed.replace(TypstRenderer.EN_DASH_REGEX, enDash)

        return processed
    }

    private static typstHeader(): string {
        return `
#set list(spacing: 0.65em)
#set text(font: "Libertinus Serif", size: 11pt)
#set page("us-letter", margin: (top: 0.75in, bottom: 1in, left: 0.75in, right: 0.75in))
#set enum(spacing: 1.5em)
        `.trim()
    }

    private static renderStep(step: Step, index: number): string {
        const hasIngredients = Boolean(step.ingredients && step.ingredients.length > 0)
        const ingredientList = (step.ingredients ?? [])
            .map((i) => `[${TypstRenderer.fancy(i)}]`)
            .join(', ')

        return `
#grid(
  columns: (2fr, 1fr),
  gutter: 3em,
  [
    #enum.item(${index + 1})[${TypstRenderer.fancy(step.text)}]
  ],
  [
    #if ${hasIngredients} {
      block(
        breakable: false,
        list(
          spacing: 1em,
          ${ingredientList}
        )
      )
    }
  ]
)
        `.trim()
    }

    private static renderMetadataGrid(metadata: Record<string, string>): string {
        const getValue = (key: string): string => metadata[key]?.replace(/"/g, '\\"') ?? ''

        return `
#grid(
  columns: (auto, auto, auto, auto, auto),
  column-gutter: 1.5em,
  row-gutter: 0.75em,
  [#align(center)[#text(weight: "bold")[Yield]]],
  [#align(center)[#text(weight: "bold")[Prep Time]]],
  [#align(center)[#text(weight: "bold")[Cook Time]]],
  [#align(center)[#text(weight: "bold")[Category]]],
  [#align(center)[#text(weight: "bold")[Cuisine]]],
  [#align(center)[${getValue('yield')}]],
  [#align(center)[${getValue('prep_time')}]],
  [#align(center)[${getValue('cook_time')}]],
  [#align(center)[${getValue('category')}]],
  [#align(center)[${getValue('cuisine')}]]
)
        `.trim()
    }

    private static renderTitleWithMetadataGrid(
        title: string,
        metadata: Record<string, string>,
        level: number,
    ): string {
        const metadataGrid = TypstRenderer.renderMetadataGrid(metadata)
        return `
#grid(
  columns: (1fr, auto),
  gutter: 2em,
  align: horizon,
  [#heading(level: ${level})[${title}]],
  [
    #align(right)[
      #block[
        #set text(size: 9pt)
        ${metadataGrid}
      ]
    ]
  ]
)
        `.trim()
    }

    private static renderSingleRecipe(recipe: ParsedRecipe, titleHeadingLevel: number = 1): string {
        const parts: string[] = []

        const source = recipe.metadata?.source?.trim()
        const footerContent =
            source && source.length > 0
                ? `#text(8pt)[${TypstRenderer.fancy(source)}] #h(1fr) #text(8pt, [#counter(page).display() / #counter(page).final().at(0)])`
                : `#h(1fr) #text(8pt, [#counter(page).display() / #counter(page).final().at(0)]) #h(1fr)`

        parts.push(`#set page(footer: context [${footerContent}])`)

        const title =
            recipe.title && recipe.title.trim().length > 0 ? recipe.title : 'Untitled Recipe'
        const metadataKeys = ['yield', 'prep_time', 'cook_time', 'category', 'cuisine'] as const
        const hasMetadata = metadataKeys.some((k) => {
            const v = recipe.metadata?.[k]
            return Boolean(v && v.trim())
        })

        if (hasMetadata) {
            parts.push(
                TypstRenderer.renderTitleWithMetadataGrid(
                    title,
                    recipe.metadata,
                    titleHeadingLevel,
                ),
            )
        } else {
            parts.push(`#heading(level: ${titleHeadingLevel})[${title}]`)
        }

        parts.push(`#v(1.5em)\n#line(length: 100%, stroke: 0.5pt)\n#v(1.5em)`)

        recipe.components.forEach((component, i) => {
            if (component.name && component.name.trim()) {
                parts.push(`=== ${component.name}\n#v(1em)`)
            }

            component.steps.forEach((step, j) => {
                parts.push(TypstRenderer.renderStep(step, j))
                if (j < component.steps.length - 1) parts.push(`#v(1em)`)
            })

            if (i < recipe.components.length - 1) parts.push(`#v(3em)`)
        })

        return parts.join('\n\n')
    }

    // Public API

    static render(recipe: ParsedRecipe): string {
        return [TypstRenderer.typstHeader(), TypstRenderer.renderSingleRecipe(recipe)].join('\n\n')
    }

    static renderCookbook(
        recipes: readonly ParsedRecipe[],
        title?: string | null,
        subtitle?: string | null,
    ): string {
        const parts: string[] = []
        parts.push(TypstRenderer.typstHeader())

        const body: string[] = []

        if ((title && title.trim()) || (subtitle && subtitle.trim())) {
            body.push(`#v(5cm)`)
            body.push(
                `#align(center)[#text(size: 22pt)[#heading(level: 1, outlined: false)[${title ?? ''}]]]`,
            )
            if (subtitle && subtitle.trim()) {
                body.push(`#v(1cm)`)
                body.push(`#align(center)[#heading(level: 2, outlined: false)[${subtitle}]]`)
            }
            body.push(`#pagebreak()`)
        }

        body.push(
            `#align(center)[#heading(level: 1, outlined: false)[Contents]]`,
            `#v(1cm)`,
            `#outline(title: none, depth: 2)`,
            `#pagebreak()`,
            `#counter(page).update(1)`,
        )

        const byCategory = new Map<string, ParsedRecipe[]>()
        for (const r of recipes) {
            const cat = r.metadata?.category?.trim() || 'Uncategorized'
            const list = byCategory.get(cat) ?? []
            list.push(r)
            byCategory.set(cat, list)
        }

        const sorted = [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))

        sorted.forEach(([category, list], catIdx) => {
            body.push(`#v(5cm)`, `#align(center)[#heading(level: 1)[${category}]]`, `#pagebreak()`)

            list.forEach((r, recIdx) => {
                body.push(TypstRenderer.renderSingleRecipe(r, 2))
                const isLast = recIdx === list.length - 1 && catIdx === sorted.length - 1
                if (!isLast) body.push(`#pagebreak()`)
            })
        })

        parts.push(body.join('\n\n'))
        return parts.join('\n\n')
    }
}
