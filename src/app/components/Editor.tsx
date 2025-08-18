import { useState } from "react";
import "./Editor.css";
import type { Recipe } from "@/shared/recipe.ts";

type EditorProps = {
    recipe: Recipe;
    onSave: (id: number, content: string) => void;
};

export function Editor({ recipe, onSave }: EditorProps) {
    const [content, setContent] = useState(recipe.content);

    const handleSave = () => {
        onSave(recipe.id!, content);
    };

    return (
        <section className="editor">
            <div className="editor-header">
                <button onClick={handleSave}>Save</button>
            </div>
            <textarea
                value={content}
                className="editor-textarea"
                onChange={(e) => setContent(e.target.value)}
            />
        </section>
    );
}