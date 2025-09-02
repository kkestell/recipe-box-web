import { useEffect, useMemo, useRef, useState } from 'react'
import { parseRecipe } from '@/shared/serialization.ts'

type EditorProps = {
    value: string
    onChange: (content: string, meta: { title: string; error: string | null }) => void
}

export function RecipeEditor({ value, onChange }: EditorProps) {
    const [text, setText] = useState<string>(value ?? '')
    const onChangeRef = useRef(onChange)
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const highlightRef = useRef<HTMLDivElement | null>(null)

    onChangeRef.current = onChange

    useEffect(() => {
        if (value !== text) setText(value ?? '')
    }, [value]) // keep textarea in sync with external updates

    useEffect(() => {
        const [parsed, errors] = parseRecipe(text)
        onChangeRef.current(text, {
            title: parsed.title ?? 'Untitled Recipe',
            error: text.trim().length === 0 ? '' : errors.length > 0 ? errors.join('\n') : null,
        })
        // init meta once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const highlightHtml = useMemo(() => {
        const escape = (s: string) =>
            s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return text
            .split('\n')
            .map((line) => {
                const escaped = escape(line)

                // Special cases checked first
                if (line === '---') return `<span class="metadata">${escaped}</span>`
                if (/^[a-z_]+:/.test(line)) return `<span class="metadata">${escaped}</span>`

                // Fallback to existing rules
                if (line.startsWith('=')) return `<span class="title">${escaped}</span>`
                if (line.startsWith('>')) return `<span class="note">${escaped}</span>`
                if (line.startsWith('+')) return `<span class="component">${escaped}</span>`
                if (line.startsWith('#')) return `<span class="step">${escaped}</span>`
                if (line.startsWith('-')) return `<span class="ingredient">${escaped}</span>`
                return escaped
            })
            .join('\n')
    }, [text])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value
        setText(next)
        const [parsed, errors] = parseRecipe(next)
        onChangeRef.current(next, {
            title: parsed.title ?? 'Untitled Recipe',
            error: next.trim().length === 0 ? '' : errors.length > 0 ? errors.join('\n') : null,
        })
    }

    const handleScroll = () => {
        if (!textareaRef.current || !highlightRef.current) return
        highlightRef.current.scrollTop = textareaRef.current.scrollTop
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }

    useEffect(() => {
        // keep scroll positions aligned after external value changes
        handleScroll()
    }, [text])

    return (
        <div id="container" className="recipe-editor-container">
            <div
                id="highlight"
                ref={highlightRef}
                className="recipe-highlight"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightHtml }}
            />
            <textarea
                id="editor"
                ref={textareaRef}
                className="recipe-textarea"
                value={text}
                onChange={handleChange}
                onScroll={handleScroll}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
            />
        </div>
    )
}
