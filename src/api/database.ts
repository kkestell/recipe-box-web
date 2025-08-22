import { Database as BunDatabase } from "bun:sqlite";
import { join } from "node:path";
import {type Recipe, type NewRecipe, type ExistingRecipe, parseRecipe} from "@/shared/recipe.ts";

const DB_PATH = join(process.cwd(), "data", "recipes.sqlite");

export class Database {
    private db: BunDatabase;

    constructor() {
        this.db = new BunDatabase(DB_PATH, { create: true });
        this.db.exec("PRAGMA journal_mode = WAL;");
    }

    public init_db() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS recipes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                content TEXT NOT NULL,
                is_public INTEGER NOT NULL DEFAULT 0,
                user_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log("Database initialized.");
    }

    public createUser(username: string, password_hash: string) {
        return this.db
            .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
            .run(username, password_hash);
    }

    public getUserByUsername(username: string) {
        return this.db
            .query("SELECT id, password_hash FROM users WHERE username = ?")
            .get(username) as { id: number; password_hash: string } | undefined;
    }

    public getUserById(id: number) {
        return this.db.query("SELECT id, username FROM users WHERE id = ?").get(id) as { id: number, username: string } | undefined;
    }

    public createSession(user_id: number, token: string) {
        return this.db
            .prepare("INSERT INTO sessions (user_id, token) VALUES (?, ?)")
            .run(user_id, token);
    }

    public getUserIdBySessionToken(token: string) {
        const row = this.db
            .query("SELECT user_id FROM sessions WHERE token = ?")
            .get(token) as { user_id: number } | undefined;
        return row?.user_id ?? null;
    }

    public deleteSession(token: string) {
        return this.db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }

    public getPublicRecipes(): Recipe[] {
        const rows = this.db
            .query(
                "SELECT id, user_id, title, category, is_public, content FROM recipes WHERE is_public = 1",
            )
            .all() as (Omit<Recipe, 'is_public'> & { is_public: 0 | 1 })[];

        return rows.map(row => ({
            ...row,
            is_public: row.is_public === 1,
        }));
    }

    public getUserRecipes(user_id: number): Recipe[] {
        const rows = this.db
            .query(
                "SELECT id, user_id, title, category, is_public, content FROM recipes WHERE user_id = ?",
            )
            .all(user_id) as (Omit<Recipe, 'is_public'> & { is_public: 0 | 1 })[];

        return rows.map(row => ({
            ...row,
            is_public: row.is_public === 1,
        }));
    }

    public createRecipe(content: string, user_id: number): ExistingRecipe {
        const [parsed, errors] = parseRecipe(content);
        const result = this.db
            .prepare(
                "INSERT INTO recipes (title, category, content, is_public, user_id) VALUES (?, ?, ?, ?, ?)",
            )
            .run(
                parsed.title ?? "Untitled Recipe",
                parsed.metadata["category"] ?? "Uncategorized",
                content,
                parsed.metadata["public"]?.toLowerCase() === 'true' ? 1 : 0,
                user_id,
            );
        return this.getRecipeById(result.lastInsertRowid as number);
    }

    public getRecipeById(recipe_id: number): ExistingRecipe {
        const row = this.db
            .query(
                "SELECT id, user_id, title, category, is_public, content FROM recipes WHERE id = ?",
            )
            .get(recipe_id);
        if (!row)
            throw new Error("Could not find recipe");
        return row as ExistingRecipe;
    }

    public updateRecipe(id: number, content: string): ExistingRecipe {
        const [parsed, errors] = parseRecipe(content);
        this.db
            .prepare(
                "UPDATE recipes SET title = ?, category = ?, content = ?, is_public = ? WHERE id = ?",
            )
            .run(
                parsed.title ?? "Untitled Recipe",
                parsed.metadata["category"] ?? "Uncategorized",
                content,
                parsed.metadata["public"]?.toLowerCase() === 'true' ? 1 : 0,
                id
            );
        return this.getRecipeById(id);
    }

    public deleteRecipe(id: number, user_id: number) {
        return this.db
            .prepare("DELETE FROM recipes WHERE id = ? AND user_id = ?")
            .run(id, user_id);
    }
}
