import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import TopBar from './components/TopBar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import CreateApplication from './pages/CreateApplication'
import ViewApplication from './pages/ViewApplication'
import Profile from './pages/Profile'
import Applicants from './pages/Applicants'
import EditApplication from './pages/EditApplication'
import ApplicantDetail from './pages/ApplicantDetail'
import PublishMerit from './pages/PublishMerit'
import ApplicantHistory from './pages/ApplicantHistory'
import './App.css'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userEmail, setUserEmail] = useState(null)
    const navigate = useNavigate()
    const inactivityTimerRef = useRef(null)
    const refreshTimerRef = useRef(null)
    const lastActivityRef = useRef(Date.now())

    // Check authentication on mount - KEEP USER LOGGED IN ON REFRESH
    useEffect(() => {
        const token = localStorage.getItem('accessToken')
        const email = localStorage.getItem('userEmail')
        if (token && email) {
            setIsAuthenticated(true)
            setUserEmail(email)
            startActivityMonitoring()
            startTokenRefresh()
        }
    }, [])

    // Auto-logout ONLY on tab/browser close (not on refresh)
    useEffect(() => {
        const handleUnload = () => {
            if (isAuthenticated) {
                // Call logout API synchronously using sendBeacon
                const token = localStorage.getItem('accessToken')
                const blob = new Blob([JSON.stringify({})], { type: 'application/json' })
                navigator.sendBeacon(
                    'https://api.gramsamruddhi.in/auth/logout/zp-staff',
                    blob
                )

                // Clear storage
                localStorage.removeItem('accessToken')
                localStorage.removeItem('userEmail')
            }
        }

        window.addEventListener('unload', handleUnload)

        return () => {
            window.removeEventListener('unload', handleUnload)
        }
    }, [isAuthenticated])

    // Monitor user activity
    const resetActivityTimer = () => {
        lastActivityRef.current = Date.now()

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }

        inactivityTimerRef.current = setTimeout(() => {
            handleLogout(true)
        }, 15 * 60 * 1000) // 15 minutes
    }

    const startActivityMonitoring = () => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

        events.forEach(event => {
            document.addEventListener(event, resetActivityTimer)
        })

        resetActivityTimer()

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, resetActivityTimer)
            })
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current)
            }
        }
    }

    // Auto-refresh token every 5 minutes
    const startTokenRefresh = () => {
        const refreshToken = async () => {
            try {
                const response = await fetch('https://api.gramsamruddhi.in/auth/refresh/zp-staff', {
                    method: 'POST',
                    credentials: 'include'
                })

                const data = await response.json()

                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken)
                } else {
                    handleLogout(false)
                }
            } catch (error) {
                console.error('Token refresh failed:', error)
            }
        }

        // Refresh every 5 minutes
        refreshTimerRef.current = setInterval(refreshToken, 5 * 60 * 1000)

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current)
            }
        }
    }

    const handleLogin = (email, accessToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('userEmail', email)
        setIsAuthenticated(true)
        setUserEmail(email)
        startActivityMonitoring()
        startTokenRefresh()
        navigate('/zp-staff/dashboard')
    }

    const handleLogout = async (callApi = true) => {
        if (callApi) {
            try {
                await fetch('https://api.gramsamruddhi.in/auth/logout/zp-staff', {
                    method: 'POST',
                    credentials: 'include'
                })
            } catch (error) {
                console.error('Logout API error:', error)
            }
        }

        localStorage.removeItem('accessToken')
        localStorage.removeItem('userEmail')
        setIsAuthenticated(false)
        setUserEmail(null)

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current)
        }

        navigate('/zp-staff')
    }

    const getInactivityTime = () => {
        return Date.now() - lastActivityRef.current
    }

    return (
        <div className="app">
            <TopBar
                isAuthenticated={isAuthenticated}
                userEmail={userEmail}
                onLogout={() => handleLogout(true)}
                getInactivityTime={getInactivityTime}
            />
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
                    <Route
                        path="/zp-staff/create-application"
                        element={
                            isAuthenticated ?
                                <CreateApplication /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />
                    <Route
                        path="/zp-staff/view-application"
                        element={
                            isAuthenticated ?
                                <ViewApplication /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />
                    <Route
                        path="/zp-staff/profile"
                        element={
                            isAuthenticated ?
                                <Profile /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />
                    <Route
                        path="/zp-staff/:applicationId/applicants"
                        element={
                            isAuthenticated ?
                                <Applicants /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />
                    <Route
                        path="/zp-staff/:applicationId/edit"
                        element={
                            isAuthenticated ?
                                <EditApplication /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />

                    <Route
                        path="/zp-staff/:applicationId/applicants/:applicantId"
                        element={
                            isAuthenticated ?
                                <ApplicantDetail /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />

                    <Route
                        path="/zp-staff/:applicationId/publish-merit"
                        element={
                            isAuthenticated ?
                                <PublishMerit /> :
                                <Navigate to="/zp-staff" replace />
                        }
                    />

                    <Route
                        path="/zp-staff/:applicationId/applicants/:applicantId/history"
                        element={
                            isAuthenticated ?
                                <ApplicantHistory /> :
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
