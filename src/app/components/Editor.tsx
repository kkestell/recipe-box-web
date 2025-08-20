import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import {
	HighlightStyle,
	StreamLanguage,
	syntaxHighlighting,
} from "@codemirror/language";
import { simpleMode } from "@codemirror/legacy-modes/mode/simple-mode";
import { EditorView } from "@codemirror/view";
import { Recipe } from "@/shared/recipe.ts";
import { tags } from "@lezer/highlight";

type EditorProps = {
	recipe: Recipe;
	onSave: (id: number, content: string) => void;
	onDelete: (id: number) => void;
};

const recipeSyntaxHighlighting = StreamLanguage.define(
	simpleMode({
		start: [
			{ regex: /([a-z_]+:.*)|(-{3})/, token: "unit", sol: true },
			{ regex: /=.*/, token: "heading", sol: true },
			{ regex: />.*/, token: "comment", sol: true },
			{ regex: /\+.*/, token: "keyword", sol: true },
			{ regex: /#.*/, token: "number", sol: true },
			{ regex: /- .*/, token: "string", sol: true },
		],
	}),
);

const recipeHighlightStyle = HighlightStyle.define([
	{ tag: tags.unit, color: "#666", fontFamily: "monospace" },
	{ tag: tags.keyword, color: "#aaa", fontWeight: "bold" },
	{ tag: tags.comment, color: "#888" },
	{ tag: tags.string, color: "#aaa", marginLeft: "1rem" },
	{ tag: tags.number, color: "#eee" },
	{ tag: tags.heading, fontWeight: "bold", color: "#fff" },
]);

export function Editor({ recipe, onSave, onDelete }: EditorProps) {
	const [content, setContent] = useState(recipe.content);
	const [title, setTitle] = useState(() => {
		try {
			return Recipe.parse(recipe.content).title || "Untitled Recipe";
		} catch {
			return "Untitled Recipe";
		}
	});
	const [error, setError] = useState<string | null>(null);

	// When a new recipe is selected, update the editor's content.
	useEffect(() => {
		setContent(recipe.content);
	}, [recipe.id]);

	// Handle parsing the recipe content for title and errors after edits.
	useEffect(() => {
		const handler = setTimeout(() => {
			try {
				const parsedRecipe = Recipe.parse(content);
				setTitle(parsedRecipe.title || "Untitled Recipe");
				setError(null);
			} catch (e: any) {
				setTitle("Untitled Recipe");
				setError(e.message);
			}
		}, 250);

		return () => clearTimeout(handler);
	}, [content]);

	// Derive the dirty state on every render.
	const isDirty = content !== recipe.content;

	const handleSave = () => {
		onSave(recipe.id!, content);
	};

	const handleDelete = () => {
		onDelete(recipe.id!);
		setContent("");
	};

	return (
		<section className="editor">
			<div className="editor-header">
				<button
					className="save"
					onClick={handleSave}
					disabled={!isDirty || error !== null}
				>
					Save
				</button>
				<h2 className="editor-title">{isDirty ? `* ${title}` : title}</h2>
				{recipe.id && (
					<button className="delete" onClick={handleDelete}>
						Delete
					</button>
				)}
			</div>
			<div className="editor-content">
				<CodeMirror
					value={content}
					height="100%"
					className="editor-codemirror"
					basicSetup={{ lineNumbers: false, foldGutter: false }}
					extensions={[
						recipeSyntaxHighlighting,
						EditorView.lineWrapping,
						syntaxHighlighting(recipeHighlightStyle),
					]}
					onChange={(value) => setContent(value)}
				/>
			</div>
			{error && <p className="editor-error">{error}</p>}
		</section>
	);
}
