import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/api'
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
    const handleLogoutRef = useRef(null)

    const resetActivityTimer = useCallback(() => {
        setStaffLastActivity()

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }

        inactivityTimerRef.current = setTimeout(() => {
            handleLogoutRef.current?.(true)
        }, ACTIVITY_TIMEOUT_MS)
    }, [])

    const stopActivityMonitoring = useCallback(() => {
        ACTIVITY_EVENTS.forEach((eventName) => {
            document.removeEventListener(eventName, resetActivityTimer)
        })

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
            inactivityTimerRef.current = null
        }
    }, [resetActivityTimer])

    const stopTokenRefresh = useCallback(() => {
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current)
            refreshTimerRef.current = null
        }
    }, [])

    const clearSessionState = useCallback(() => {
        clearStaffSession()
        setIsAuthenticated(false)
        setUserEmail(null)
        stopActivityMonitoring()
        stopTokenRefresh()
    }, [stopActivityMonitoring, stopTokenRefresh])

    const handleLogout = useCallback(async (callApi = true) => {
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
    }, [clearSessionState, navigate])

    useEffect(() => {
        handleLogoutRef.current = handleLogout
    }, [handleLogout])

    const startActivityMonitoring = useCallback(() => {
        stopActivityMonitoring()

        ACTIVITY_EVENTS.forEach((eventName) => {
            document.addEventListener(eventName, resetActivityTimer)
        })

        resetActivityTimer()
    }, [resetActivityTimer, stopActivityMonitoring])

    const startTokenRefresh = useCallback((hitApiImmediately = false) => {
        const refreshToken = async () => {
            try {
                const response = await fetch(apiUrl('/auth/refresh/zp-staff'), {
                    method: 'POST',
                    credentials: 'include',
                })

                if (response.status === 401 || response.status === 403) {
                    handleLogoutRef.current?.(false)
                    return
                }

                const data = await response.json()

                // The user may have logged out while this request was in
                // flight; persisting the response would resurrect the session.
                if (!getStaffAccessToken()) {
                    return
                }

                if (data.accessToken) {
                    setStaffAccessToken(data.accessToken)
                    setStaffUserEmail(data.user)
                    setStaffLastRefresh()

                    if (data.meta) {
                        setStaffUserInfo(data.meta)
                    }
                } else {
                    handleLogoutRef.current?.(false)
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
    }, [])

    const handleLogin = useCallback((email, accessToken, redirectTo = '/zp-staff/dashboard') => {
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
    }, [navigate, startActivityMonitoring, startTokenRefresh])

    const getInactivityTime = useCallback(() => {
        const lastActivityString = getStaffLastActivity()

        if (isAuthenticated && !lastActivityString) {
            handleLogout(true)
            return 0
        }

        const lastActivity = new Date(lastActivityString)
        return Number.isNaN(lastActivity.getTime()) ? 0 : Date.now() - lastActivity
    }, [handleLogout, isAuthenticated])

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
    }, [
        clearSessionState,
        startActivityMonitoring,
        startTokenRefresh,
        stopActivityMonitoring,
        stopTokenRefresh,
    ])

    return {
        getInactivityTime,
        handleLogin,
        handleLogout,
        authReady,
        isAuthenticated,
        userEmail,
    }
}
