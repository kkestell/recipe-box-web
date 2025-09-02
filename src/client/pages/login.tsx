import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/client/components/auth_context.tsx'

export function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const { setUser } = useAuth()
    const navigate = useNavigate()

    const handleLogin = async () => {
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            if (res.ok) {
                const data = await res.json()
                setUser(data)
                navigate('/library')
                return
            }

            const message = await res.text()

            if (res.status === 400) {
                setError(message || 'Missing username or password.')
            } else if (res.status === 401) {
                setError('Invalid username or password.')
            } else {
                setError(message || 'Login failed. Please try again.')
            }
        } catch {
            setError('An error occurred. Please try again later.')
        }
    }

    return (
        <div className="main-container main-container-centered">
            <div className="form-container">
                <h2>Log In</h2>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault()
                        await handleLogin()
                    }}
                >
                    {error && <p className="error-message">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-submit">
                        Log In
                    </button>
                </form>
                <p className="form-switch">
                    Don't have an account? <Link to="/sign-up">Sign up</Link>
                </p>
            </div>
        </div>
    )
}
