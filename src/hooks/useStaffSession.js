import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl, fetchJson } from '../lib/api'
import {
    clearStaffPendingRedirect,
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
} from '../lib/authStorage'

const ACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
const TOKEN_REFRESH_MS = 5 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

export const useStaffSession = () => {
    const [authReady, setAuthReady] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userEmail, setUserEmail] = useState(null)
    const navigate = useNavigate()
    const inactivityTimerRef = useRef(null)
    const refreshTimerRef = useRef(null)

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

    const clearSessionState = () => {
        clearStaffSession()
        setIsAuthenticated(false)
        setUserEmail(null)
        stopActivityMonitoring()
        stopTokenRefresh()
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

        clearSessionState()
        clearStaffPendingRedirect()
        setAuthReady(true)
        navigate('/zp-staff', { replace: true })
    }

    const resetActivityTimer = () => {
        setStaffLastActivity()

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }

        inactivityTimerRef.current = setTimeout(() => {
            handleLogout(true)
        }, ACTIVITY_TIMEOUT_MS)
    }

    const startActivityMonitoring = () => {
        stopActivityMonitoring()

        ACTIVITY_EVENTS.forEach((eventName) => {
            document.addEventListener(eventName, resetActivityTimer)
        })

        resetActivityTimer()
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
            refreshTimerRef.current = setInterval(refreshToken, TOKEN_REFRESH_MS)
        }
    }

    const handleLogin = (email, accessToken, redirectTo = '/zp-staff/dashboard') => {
        setStaffAccessToken(accessToken)
        setStaffUserEmail(email)
        setIsAuthenticated(true)
        setUserEmail(email)
        setAuthReady(true)
        startActivityMonitoring()
        startTokenRefresh()
        navigate(redirectTo, { replace: true })
        setTimeout(() => {
            clearStaffPendingRedirect()
        }, 1000)
    }

    const getInactivityTime = () => {
        const lastActivityString = getStaffLastActivity()

        if (isAuthenticated && !lastActivityString) {
            handleLogout(true)
            return 0
        }

        return Date.now() - new Date(lastActivityString)
    }

    useEffect(() => {
        const lastActivityString = getStaffLastActivity()
        if (!lastActivityString) {
            clearSessionState()
            setAuthReady(true)
            return undefined
        }

        const lastActivity = new Date(lastActivityString)
        const fifteenMinutesAgo = new Date(Date.now() - ACTIVITY_TIMEOUT_MS)

        if (lastActivity < fifteenMinutesAgo) {
            clearSessionState()
            setAuthReady(true)
            return undefined
        }

        const token = getStaffAccessToken()
        const email = getStaffUserEmail()

        if (!token || !email) {
            clearSessionState()
            setAuthReady(true)
            return undefined
        }

        setIsAuthenticated(true)
        setUserEmail(email)
        startActivityMonitoring()

        let lastRefreshString = getStaffLastRefresh()
        if (!lastRefreshString) {
            setStaffLastRefresh()
            lastRefreshString = new Date(Date.now() - TOKEN_REFRESH_MS).toISOString()
        }

        const lastRefresh = new Date(lastRefreshString)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
        startTokenRefresh(lastRefresh < twoMinutesAgo)
        setAuthReady(true)

        return () => {
            stopActivityMonitoring()
            stopTokenRefresh()
        }
    }, [])

    return {
        getInactivityTime,
        handleLogin,
        handleLogout,
        authReady,
        isAuthenticated,
        userEmail,
    }
}
