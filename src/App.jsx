import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import TopBar from './components/TopBar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import './App.css'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userEmail, setUserEmail] = useState(null)

    // Check if user is already authenticated on app load
    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        const email = localStorage.getItem('userEmail')
        if (token && email) {
            setIsAuthenticated(true)
            setUserEmail(email)
        }
    }, [])

    const handleLogin = (email, accessToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('userEmail', email)
        setIsAuthenticated(true)
        setUserEmail(email)
    }

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('userEmail')
        setIsAuthenticated(false)
        setUserEmail(null)
    }

    return (
        <div className="app">
            <TopBar isAuthenticated={isAuthenticated} userEmail={userEmail} onLogout={handleLogout} />
            <main className="main-content">
                <Routes>
                    <Route
                        path="/zp-staff"
                        element={
                            isAuthenticated ?
                                <Navigate to="/zp-staff/dashboard" replace /> :
                                <LoginPage onLogin={handleLogin} />
                        }
                    />
                    <Route
                        path="/zp-staff/dashboard"
                        element={
                            isAuthenticated ?
                                <Dashboard /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />
                    <Route path="/" element={<Navigate to="/zp-staff" replace />} />
                </Routes>
            </main>
        </div>
    )
}

export default App