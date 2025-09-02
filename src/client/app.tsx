import React, { type JSX } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Header } from '@/client/components/header'
import { Homepage } from '@/client/pages/homepage'
import { Login } from '@/client/pages/login.tsx'
import { Signup } from '@/client/pages/signup.tsx'
import { Library } from '@/client/pages/library.tsx'
import { RecipeDetail } from '@/client/pages/recipe_detail.tsx'
import { RecipeList } from '@/client/pages/recipe_list.tsx'

import { AuthProvider, useAuth } from '@/client/components/auth_context.tsx'

import '@/client/styles/global.css'
import '@/client/styles/homepage.css'
import '@/client/styles/library.css'
import '@/client/styles/recipe.css'
import '@/client/styles/recipe_detail.css'
import '@/client/styles/recipe_list.css'
import logo from '@/client/assets/logo.svg'

function ProtectedRoute({
    user,
    isLoading,
    children,
}: {
    user: any
    isLoading: boolean
    children: JSX.Element
}) {
    if (isLoading) {
        return <p className="loading">Loading...</p>
    }

    if (!user) {
        return <Navigate to="/" replace />
    }

    return children
}

function AppContent() {
    const { user, logout, isLoading } = useAuth()

    return (
        <div className="app">
            <div className="app-content">
                <Header user={user} onLogout={logout} />
                <Routes>
                    <Route path="/" element={<Homepage />} />
                    <Route path="/log-in" element={<Login />} />
                    <Route path="/sign-up" element={<Signup />} />
                    <Route
                        path="/library"
                        element={
                            <ProtectedRoute user={user} isLoading={isLoading}>
                                <Library user={user!} />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/recipes/:id" element={<RecipeDetail />} />
                    <Route path="/recipes" element={<RecipeList />} />
                </Routes>
            </div>
        </div>
    )
}

export function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    )
}
