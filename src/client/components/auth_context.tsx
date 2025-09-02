import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '@/shared/models/recipe.ts'

interface AuthContextType {
    user: User | null
    setUser: (user: User | null) => void
    logout: () => Promise<void>
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        fetch('/api/me')
            .then(async (res) => {
                if (res.ok) {
                    const data = await res.json()
                    setUser(data)
                }
                setIsLoading(false)
            })
            .catch(() => {
                setIsLoading(false)
            })
    }, [])

    const logout = async () => {
        await fetch('/api/logout', { method: 'POST' })
        setUser(null)
        navigate('/')
    }

    return (
        <AuthContext.Provider value={{ user, setUser, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
