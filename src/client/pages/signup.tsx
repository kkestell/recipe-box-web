import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/client/components/auth_context.tsx'

export function Signup() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const { setUser } = useAuth()
    const navigate = useNavigate()

    const handleSignup = async () => {
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            if (res.ok) {
                const data = await res.json()
                setUser(data)
                navigate('/library')
            } else {
                const message = await res.text()
                setError(message || 'Signup failed. Please try again.')
            }
        } catch {
            setError('An error occurred. Please try again later.')
        }
    }

    return (
        <div className="main-container main-container-centered">
            <div className="form-container">
                <h2>Sign Up</h2>
                <form
                    onSubmit={async (e) => {
                        e.preventDefault()
                        await handleSignup()
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
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm Password</label>
                        <input
                            type="password"
                            id="confirm-password"
                            name="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn-submit">
                        Sign Up
                    </button>
                </form>
                <p className="form-switch">
                    Already have an account? <Link to="/log-in">Log in</Link>
                </p>
            </div>
        </div>
    )
}
