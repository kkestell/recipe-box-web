import { useState } from "react";
import type { Recipe } from "./App";
import CodeMirror from "@uiw/react-codemirror";
import { StreamLanguage } from "@codemirror/language";
import { simpleMode } from "@codemirror/legacy-modes/mode/simple-mode";
import { EditorView } from "@codemirror/view";

type EditorProps = {
	recipe: Recipe;
	onSave: (slug: string, content: string) => void;
};

const recipeSyntaxHighlighting = StreamLanguage.define(
	simpleMode({
		start: [
			{ regex: /=.*/, token: "header", sol: true }, // Titles as headers
			{ regex: />.*/, token: "comment", sol: true }, // Notes as comments
			{ regex: /\+.*/, token: "keyword", sol: true }, // Components as keywords
			{ regex: /#.*/, token: "number", sol: true }, // Steps as numbers
			{ regex: /- .*/, token: "string", sol: true }, // Ingredients as strings
		],
	}),
);

export function Editor({ recipe, onSave }: EditorProps) {
	const [content, setContent] = useState(recipe.content);

	const handleSave = () => {
		onSave(recipe.slug, content);
	};

	return (
		<section className="editor">
			<div className="editor-header">
				<button onClick={handleSave}>Save</button>
			</div>
			<CodeMirror
				value={content}
				height="100%"
				className="editor-codemirror"
				extensions={[recipeSyntaxHighlighting, EditorView.lineWrapping]}
				onChange={(value) => setContent(value)}
			/>
		</section>
	);
}
