import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import { apiUrl, fetchJson } from './lib/api'
import {
    clearStaffSession,
    getStaffAccessToken,
    getStaffLastActivity,
    getStaffLastRefresh,
    getStaffUserEmail,
    setStaffAccessToken,
    setStaffLastActivity,
    setStaffLastRefresh,
    setStaffUserEmail,
    setStaffUserInfo,
} from './lib/authStorage'
import ApplicantDetail from './pages/ApplicantDetail'
import ApplicantHistory from './pages/ApplicantHistory'
import Applicants from './pages/Applicants'
import CreateApplication from './pages/CreateApplication'
import Dashboard from './pages/Dashboard'
import EditApplication from './pages/EditApplication'
import LoginPage from './pages/LoginPage'
import Profile from './pages/StaffProfile.jsx'
import PublishMerit from './pages/PublishMerit'
import ViewApplication from './pages/ViewApplication'
import './App.css'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userEmail, setUserEmail] = useState(null)
    const navigate = useNavigate()
    const inactivityTimerRef = useRef(null)
    const refreshTimerRef = useRef(null)

    useEffect(() => {
        const lastActivityString = getStaffLastActivity()
        if (!lastActivityString) {
            handleLogout(true)
            return undefined
        }

        const lastActivity = new Date(lastActivityString)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

        if (lastActivity < fifteenMinutesAgo) {
            handleLogout(true)
            return undefined
        }

        const token = getStaffAccessToken()
        const email = getStaffUserEmail()

        if (!token || !email) {
            handleLogout(true)
            return undefined
        }

        setIsAuthenticated(true)
        setUserEmail(email)
        startActivityMonitoring()

        let lastRefreshString = getStaffLastRefresh()
        if (!lastRefreshString) {
            setStaffLastRefresh()
            lastRefreshString = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        }

        const lastRefresh = new Date(lastRefreshString)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

        return startTokenRefresh(lastRefresh < twoMinutesAgo)
    }, [])

    const stopActivityMonitoring = () => {
        ACTIVITY_EVENTS.forEach((eventName) => {
            document.removeEventListener(eventName, resetActivityTimer)
        })

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
            inactivityTimerRef.current = null
        }
    }

    const stopTokenRefresh = () => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current)
            refreshTimerRef.current = null
        }
    }

    const resetActivityTimer = () => {
        setStaffLastActivity()

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }

        inactivityTimerRef.current = setTimeout(() => {
            handleLogout(true)
        }, 15 * 60 * 1000)
    }

    const startActivityMonitoring = () => {
        stopActivityMonitoring()

        ACTIVITY_EVENTS.forEach((eventName) => {
            document.addEventListener(eventName, resetActivityTimer)
        })

        resetActivityTimer()

        return () => {
            stopActivityMonitoring()
        }
    }

    const startTokenRefresh = (hitApiImmediately = false) => {
        const refreshToken = async () => {
            try {
                const data = await fetchJson('/auth/refresh/zp-staff', {
                    method: 'POST',
                    credentials: 'include',
                })

                if (data.accessToken) {
                    setStaffLastActivity()
                    setStaffAccessToken(data.accessToken)
                    setStaffUserEmail(data.user)
                    setStaffLastRefresh()

                    if (data.meta) {
                        setStaffUserInfo(data.meta)
                    }
                } else {
                    handleLogout(false)
                }
            } catch (error) {
                console.error('Token refresh failed:', error)
            }
        }

        if (hitApiImmediately) {
            refreshToken()
        }

        if (!refreshTimerRef.current) {
            refreshTimerRef.current = setInterval(refreshToken, 5 * 60 * 1000)
        }

        return () => {
            stopTokenRefresh()
        }
    }

    const handleLogin = (email, accessToken) => {
        setStaffAccessToken(accessToken)
        setStaffUserEmail(email)
        setIsAuthenticated(true)
        setUserEmail(email)
        startActivityMonitoring()
        startTokenRefresh()
        navigate('/zp-staff/dashboard')
    }

    const handleLogout = async (callApi = true) => {
        if (callApi) {
            try {
                await fetch(apiUrl('/auth/logout/zp-staff'), {
                    method: 'POST',
                    credentials: 'include',
                })
            } catch (error) {
                console.error('Logout API error:', error)
            }
        }

        clearStaffSession()
        setIsAuthenticated(false)
        setUserEmail(null)
        stopActivityMonitoring()
        stopTokenRefresh()
        navigate('/zp-staff')
    }

    const getInactivityTime = () => {
        const lastActivityString = getStaffLastActivity()

        if (isAuthenticated && !lastActivityString) {
            handleLogout(true)
            return 0
        }

        return Date.now() - new Date(lastActivityString)
    }

    const protectedRoutes = [
        { path: '/zp-staff/dashboard', element: <Dashboard /> },
        { path: '/zp-staff/create-application', element: <CreateApplication /> },
        { path: '/zp-staff/view-application', element: <ViewApplication /> },
        { path: '/zp-staff/profile', element: <Profile /> },
        { path: '/zp-staff/:applicationId/applicants', element: <Applicants /> },
        { path: '/zp-staff/:applicationId/edit', element: <EditApplication /> },
        { path: '/zp-staff/:applicationId/applicants/:applicantId', element: <ApplicantDetail /> },
        { path: '/zp-staff/:applicationId/publish-merit', element: <PublishMerit /> },
        { path: '/zp-staff/:applicationId/applicants/:applicantId/history', element: <ApplicantHistory /> },
    ]

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
                            isAuthenticated
                                ? <Navigate to="/zp-staff/dashboard" replace />
                                : <LoginPage onLogin={handleLogin} />
                        }
                    />
                    {protectedRoutes.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated}>
                                    {route.element}
                                </ProtectedRoute>
                            }
                        />
                    ))}
                    <Route path="/" element={<Navigate to="/zp-staff" replace />} />
                </Routes>
            </main>
        </div>
    )
}

export default App
