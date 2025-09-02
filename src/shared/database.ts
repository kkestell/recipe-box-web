import { Database as BunDatabase, type SQLQueryBindings } from 'bun:sqlite'
import { join } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { parseRecipe } from '@/shared/serialization.ts'
import type { ExistingRecipe, Recipe, User } from '@/shared/models/recipe.ts'

const DB_PATH = join(process.cwd(), 'data', 'recipes.sqlite')
const SEED_PATH = join(process.cwd(), 'seed')

type PublicFilters = {
    q?: string
    category?: string
    cuisine?: string
}

export class Database {
    private db: BunDatabase

    constructor() {
        this.db = new BunDatabase(DB_PATH, { create: true })
        this.db.run('PRAGMA journal_mode = WAL;')
    }

    public async init_db() {
        // Drop existing tables to ensure a clean slate
        this.db.run(`DROP TABLE IF EXISTS recipes;`)
        this.db.run(`DROP TABLE IF EXISTS sessions;`)
        this.db.run(`DROP TABLE IF EXISTS users;`)

        // Recreate tables
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            );
        `)

        this.db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `)

        this.db.run(`
            CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                content TEXT NOT NULL,
                is_public INTEGER NOT NULL DEFAULT 0,
                user_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `)

        // Create the default user 'kyle'
        const password_hash = await Bun.password.hash('please')
        const user = this.createUser('kyle', password_hash)
        if (!user) {
            console.error("Failed to create seed user 'kyle'.")
            return
        }

        // Seed recipes from the ./seed directory
        try {
            const files = await readdir(SEED_PATH)
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const content = await readFile(join(SEED_PATH, file), 'utf-8')
                    this.createRecipe(content, user.id)
                    console.log(`Imported recipe from ${file}`)
                }
            }
        } catch (error) {
            console.error(
                `Could not read seed directory at ${SEED_PATH}. Make sure it exists.`,
                error,
            )
        }

        console.log('Database initialized and seeded.')
    }

    public createUser(username: string, password_hash: string) {
        this.db
            .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
            .run(username, password_hash)
        return this.getUserByUsername(username)!
    }

    public getUserByUsername(username: string) {
        return this.db
            .query('SELECT id, username, password_hash FROM users WHERE username = ?')
            .get(username) as User | undefined
    }

    public getUserById(id: number) {
        return this.db
            .query('SELECT id, username, password_hash FROM users WHERE id = ?')
            .get(id) as User | undefined
    }

    public createSession(user_id: number, token: string) {
        return this.db
            .prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)')
            .run(user_id, token)
    }

    public getUserIdBySessionToken(token: string) {
        const row = this.db.query('SELECT user_id FROM sessions WHERE token = ?').get(token) as
            | { user_id: number }
            | undefined
        return row?.user_id ?? null
    }

    public deleteSession(token: string) {
        return this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    }

    public getPublicRecipesFiltered(
        filters: PublicFilters,
        limit: number,
        offset: number,
    ): Recipe[] {
        const where: string[] = ['r.is_public = 1']
        const params: SQLQueryBindings[] = []

        if (filters.category && filters.category !== 'All Categories') {
            where.push('r.category = ?')
            params.push(filters.category)
        }

        if (filters.q && filters.q.trim() !== '') {
            const like = `%${filters.q.trim()}%`
            where.push('(r.title LIKE ? OR r.content LIKE ?)')
            params.push(like, like)
        }

        if (filters.cuisine && filters.cuisine !== 'All Cuisines') {
            const likeCuisine = `%cuisine:%${filters.cuisine}%`
            where.push('r.content LIKE ?')
            params.push(likeCuisine)
        }

        const sql = `
            SELECT r.id, r.user_id, u.username, r.title, r.category, r.is_public, r.content
            FROM recipes r
            JOIN users u ON r.user_id = u.id
            WHERE ${where.join(' AND ')}
            ORDER BY r.title ASC
            LIMIT ? OFFSET ?
        `
        params.push(limit, offset)

        const rows = this.db.query(sql).all(...params) as (Omit<Recipe, 'is_public'> & {
            is_public: 0 | 1
        })[]

        return rows.map((row) => ({
            ...row,
            is_public: row.is_public === 1,
        }))
    }

    public getPublicRecipeCountFiltered(filters: PublicFilters): number {
        const where: string[] = ['is_public = 1']
        const params: SQLQueryBindings[] = []

        if (filters.category && filters.category !== 'All Categories') {
            where.push('category = ?')
            params.push(filters.category)
        }

        if (filters.q && filters.q.trim() !== '') {
            const like = `%${filters.q.trim()}%`
            where.push('(title LIKE ? OR content LIKE ?)')
            params.push(like, like)
        }

        if (filters.cuisine && filters.cuisine !== 'All Cuisines') {
            const likeCuisine = `%cuisine:%${filters.cuisine}%`
            where.push('content LIKE ?')
            params.push(likeCuisine)
        }

        const sql = `SELECT COUNT(*) as count FROM recipes WHERE ${where.join(' AND ')}`
        const row = this.db.query(sql).get(...params) as { count: number }
        return row.count
    }

    public getUserRecipes(user_id: number): Recipe[] {
        const rows = this.db
            .query(
                `SELECT r.id, r.user_id, u.username, r.title, r.category, r.is_public, r.content
                 FROM recipes r
                          JOIN users u ON r.user_id = u.id
                 WHERE r.user_id = ?`,
            )
            .all(user_id) as (Omit<Recipe, 'is_public'> & { is_public: 0 | 1 })[]

        return rows.map((row) => ({
            ...row,
            is_public: row.is_public === 1,
        }))
    }

    private _generateSlug(title: string): string {
        const baseSlug = title
            .toLowerCase()
            .trim()
            .replace(/&/g, '-and-')
            .replace(/[\s\W-]+/g, '-')
            .replace(/^-+|-+$/g, '')

        let slug = baseSlug
        let counter = 2
        while (this.db.query('SELECT 1 FROM recipes WHERE id = ?').get(slug)) {
            slug = `${baseSlug}-${counter}`
            counter++
        }
        return slug
    }

    public createRecipe(content: string, user_id: number): ExistingRecipe {
        const [parsed] = parseRecipe(content)
        const title = parsed.title ?? 'Untitled Recipe'
        const id = this._generateSlug(title)

        this.db
            .prepare(
                'INSERT INTO recipes (id, title, category, content, is_public, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            )
            .run(
                id,
                title,
                parsed.metadata.category ?? 'Uncategorized',
                content,
                parsed.metadata.public?.toLowerCase() === 'true' ? 1 : 0,
                user_id,
            )
        return this.getRecipeById(id)
    }

    public getRecipeById(recipe_id: string): ExistingRecipe {
        const row = this.db
            .query(
                `SELECT r.id, r.user_id, u.username, r.title, r.category, r.is_public, r.content
                 FROM recipes r
                          JOIN users u ON r.user_id = u.id
                 WHERE r.id = ?`,
            )
            .get(recipe_id) as Omit<ExistingRecipe, 'is_public'> & {
            is_public: 0 | 1
        }

        if (!row) throw new Error('Could not find recipe')

        return {
            ...row,
            is_public: row.is_public === 1,
        }
    }

    public updateRecipe(id: string, content: string): ExistingRecipe {
        const [parsed] = parseRecipe(content)
        this.db
            .prepare(
                'UPDATE recipes SET title = ?, category = ?, content = ?, is_public = ? WHERE id = ?',
            )
            .run(
                parsed.title ?? 'Untitled Recipe',
                parsed.metadata.category ?? 'Uncategorized',
                content,
                parsed.metadata.public?.toLowerCase() === 'true' ? 1 : 0,
                id,
            )
        return this.getRecipeById(id)
    }

    public deleteRecipe(id: string, user_id: number) {
        return this.db.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?').run(id, user_id)
    }

    public getPublicCategories(): string[] {
        const rows = this.db
            .query(
                `SELECT DISTINCT category FROM recipes WHERE is_public = 1 ORDER BY category ASC`,
            )
            .all() as { category: string }[]
        return rows.map((r) => r.category)
    }

    public getPublicCuisines(): string[] {
        const rows = this.db.query(`SELECT content FROM recipes WHERE is_public = 1`).all() as {
            content: string
        }[]

        const set = new Set<string>()
        for (const { content } of rows) {
            const [parsed] = parseRecipe(content)
            const c = parsed.metadata.cuisine?.trim()
            if (c) set.add(c)
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b))
    }
}
