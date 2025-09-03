import { randomBytes } from 'node:crypto'
import { serve } from 'bun'
import homepage from '@/client/index.html'
import { Database } from '@/shared/database.ts'
import { parseRecipe } from '@/shared/serialization.ts'
import { TypstRenderer } from '@/shared/typst_renderer.ts'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

const db = new Database()
await db.init_db()

function makeSession(user_id: number) {
    const token = randomBytes(32).toString('hex')
    db.createSession(user_id, token)
    return token
}

function getUserFromRequest(req: Request) {
    const cookie = req.headers.get('cookie') || ''
    const match = cookie.match(/session_token=([a-f0-9]+)/)
    if (!match) return null
    const token = match[1]
    if (!token) return null
    return db.getUserIdBySessionToken(token)
}

function authFail() {
    return new Response('Unauthorized', { status: 401 })
}

function setSessionCookie(token: string) {
    const isProduction = process.env.NODE_ENV === 'production'
    const secure = isProduction ? 'Secure; ' : ''
    return `session_token=${token}; HttpOnly; ${secure}SameSite=Strict; Path=/`
}

const server = serve({
    development: process.env.NODE_ENV !== 'production',
    routes: {
        '/api/auth/signup': {
            async POST(req) {
                const { username, password } = await req.json()
                if (!username || !password) {
                    return new Response('Missing fields', { status: 400 })
                }

                const existing = db.getUserByUsername(username)
                if (existing) {
                    return new Response('Username already taken', { status: 409 })
                }

                const hash = await Bun.password.hash(password, { algorithm: 'bcrypt' })
                const user = db.createUser(username, hash)

                const token = makeSession(user.id)
                return new Response(JSON.stringify({ id: user.id, username }), {
                    status: 201,
                    headers: {
                        'Content-Type': 'application/json',
                        'Set-Cookie': setSessionCookie(token),
                    },
                })
            },
        },

        '/api/auth/login': {
            async POST(req) {
                const { username, password } = await req.json()

                if (!username || !password) {
                    return new Response('Missing username or password', { status: 400 })
                }

                const user = db.getUserByUsername(username)
                const valid = user && (await Bun.password.verify(password, user.password_hash))

                if (!valid) {
                    return new Response('Invalid username or password', { status: 401 })
                }

                const token = makeSession(user.id)
                return new Response(JSON.stringify({ id: user.id, username: user.username }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Set-Cookie': setSessionCookie(token),
                    },
                })
            },
        },

        '/api/logout': {
            POST(req) {
                const cookie = req.headers.get('cookie') || ''
                const match = cookie.match(/session_token=([a-f0-9]+)/)
                if (match) {
                    db.deleteSession(match[1]!)
                }
                return new Response('Logged out', {
                    headers: {
                        'Set-Cookie':
                            'session_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
                    },
                })
            },
        },

        '/api/me': {
            GET(req) {
                const user_id = getUserFromRequest(req)
                if (!user_id) return authFail()
                const user = db.getUserById(user_id)
                return Response.json(user)
            },
        },

        '/api/recipes': {
            GET(req) {
                const url = new URL(req.url)
                const page = parseInt(url.searchParams.get('page') || '1', 10)
                const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10)
                const q = url.searchParams.get('q') || undefined
                const category = url.searchParams.get('category') || undefined
                const cuisine = url.searchParams.get('cuisine') || undefined

                const offset = (page - 1) * pageSize
                const filters = { q, category, cuisine }
                const publicRecipes = db.getPublicRecipesFiltered(filters, pageSize, offset)
                const total = db.getPublicRecipeCountFiltered(filters)

                return Response.json({
                    recipes: publicRecipes,
                    total,
                    page,
                    pageSize,
                })
            },
        },

        '/api/recipes/:id': {
            GET(req) {
                const user_id = getUserFromRequest(req)
                const recipe = db.getRecipeById(req.params.id)
                if (!recipe) return new Response('Not Found', { status: 404 })
                if (!recipe.is_public && (!user_id || user_id !== recipe.user_id)) return authFail()
                return Response.json(recipe, { status: 200 })
            },
        },

        '/api/recipes/:id/pdf': {
            async GET(req) {
                const user_id = getUserFromRequest(req)
                const recipe = db.getRecipeById(req.params.id)
                if (!recipe) return new Response('Not Found', { status: 404 })
                if (!recipe.is_public && (!user_id || user_id !== recipe.user_id)) return authFail()

                const [parsed] = parseRecipe(recipe.content)
                const typstSrc = TypstRenderer.render(parsed)

                const tmpDir = join(process.cwd(), 'tmp')
                await mkdir(tmpDir, { recursive: true })
                const id = crypto.randomUUID()
                const srcPath = join(tmpDir, `recipe-${recipe.id}-${id}.typ`)
                const pdfPath = join(tmpDir, `recipe-${recipe.id}-${id}.pdf`)

                await Bun.write(srcPath, typstSrc)

                const proc = Bun.spawn(['typst', 'compile', srcPath, pdfPath])
                const code = await proc.exited
                if (code !== 0) return new Response('PDF generation failed', { status: 500 })

                return new Response(Bun.file(pdfPath), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `inline; filename="recipe-${recipe.id}.pdf"`,
                        'Cache-Control': 'no-store',
                    },
                })
            },
        },

        '/api/users/:user_id/recipes': {
            GET(req) {
                const user_id = getUserFromRequest(req)
                if (!user_id || String(user_id) !== req.params.user_id) return authFail()
                const recipes = db.getUserRecipes(user_id)
                return Response.json(recipes)
            },
            async POST(req) {
                const user_id = getUserFromRequest(req)
                if (!user_id || String(user_id) !== req.params.user_id) return authFail()
                const content = await req.text()
                const recipe = db.createRecipe(content, user_id)
                return Response.json(recipe, { status: 201 })
            },
        },

        '/api/users/:user_id/recipes/:id': {
            async PUT(req) {
                const user_id = getUserFromRequest(req)
                if (!user_id || String(user_id) !== req.params.user_id) return authFail()
                const { id } = req.params
                const content = await req.text()
                const recipe = db.updateRecipe(id, content)
                return Response.json(recipe, { status: 200 })
            },
            DELETE(req) {
                const user_id = getUserFromRequest(req)
                if (!user_id || String(user_id) !== req.params.user_id) return authFail()
                const { id } = req.params
                db.deleteRecipe(id, user_id)
                return new Response(`Recipe '${id}' deleted.`)
            },
        },

        '/api/categories': {
            GET() {
                const categories = db.getPublicCategories()
                return Response.json(categories)
            },
        },

        '/api/cuisines': {
            GET() {
                const cuisines = db.getPublicCuisines()
                return Response.json(cuisines)
            },
        },

        '/api/*': () => new Response('Not Found', { status: 404 }),

        '/*': homepage,
    },
    error: (err) => {
        console.error('Unhandled error:', err)
        return new Response('Internal Server Error', { status: 500 })
    },
})

console.log(`Listening on ${server.url}`)
