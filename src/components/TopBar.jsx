import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import { getStaffUserInfo, setStaffUserInfo } from '../lib/authStorage'
import './TopBar.css'

const TopBar = ({ isAuthenticated, userEmail, onLogout, getInactivityTime }) => {
    const [timeRemaining, setTimeRemaining] = useState(15 * 60) // 15 minutes in seconds
    const [userInfo, setUserInfo] = useState(() => getStaffUserInfo() || {})

    useEffect(() => {
        if (!isAuthenticated) return

        const interval = setInterval(() => {
            const inactiveMs = getInactivityTime()
            const inactiveSec = Math.floor(inactiveMs / 1000)
            const remaining = Math.max(0, (15 * 60) - inactiveSec)
            setTimeRemaining(remaining)
        }, 1000)

        return () => clearInterval(interval)
    }, [isAuthenticated, getInactivityTime])

    useEffect(() => {
        if (!isAuthenticated) {
            setUserInfo({})
            return undefined
        }

        let active = true
        const cachedUserInfo = getStaffUserInfo() || {}
        setUserInfo(cachedUserInfo)

        const fetchProfile = async () => {
            try {
                const data = await fetchJson('/zp-staff/profile', {
                    method: 'GET',
                    headers: createAuthHeaders(),
                })

                // Ignore responses that land after logout or a user switch,
                // so we don't re-persist the previous user's identity.
                if (!active) {
                    return
                }

                if (data.result && data.data) {
                    const nextUserInfo = {
                        ...cachedUserInfo,
                        name: cachedUserInfo.name || data.data.userId || '',
                        designation: data.data.designation || '',
                    }

                    setStaffUserInfo(nextUserInfo)
                    setUserInfo(nextUserInfo)
                }
            } catch {
                // Keep cached identity if profile refresh fails.
            }
        }

        fetchProfile()

        return () => {
            active = false
        }
    }, [isAuthenticated, userEmail])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getDisplayName = () => {
        if (!userEmail) return ''
        if (userInfo.name) return userInfo.name
        return userEmail.split('@')[0]
    }

    const getDisplayIdentity = () => {
        const displayName = getDisplayName()

        if (!displayName) {
            return ''
        }

        return userInfo.designation
            ? `${userInfo.designation} : ${displayName}`
            : displayName
    }

    return (
        <header className="topbar">
            <div className="topbar-content">
                <div className="topbar-left">
                    <h1 className="domain-name">ग्राम समृद्धि, चंद्रपूर</h1>
                </div>

                <nav className="topbar-nav">
                    {isAuthenticated && (
                        <>
                            <Link to="/zp-staff/dashboard" className="nav-link">Dashboard</Link>
                        </>
                    )}
                </nav>

                <div className="topbar-right">
                    {isAuthenticated ? (
                        <>
                            <div className="activity-timer">
                                <span className="timer-label">Auto-logout in:</span>
                                <span className="timer-value">{formatTime(timeRemaining)}</span>
                            </div>
                            <div className="user-section">
                                <span className="user-email">{getDisplayIdentity()}</span>
                                <button onClick={onLogout} className="logout-btn">Logout</button>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </header>
    )
}

export default TopBar
