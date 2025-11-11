import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './TopBar.css'

const TopBar = ({ isAuthenticated, userEmail, onLogout, getInactivityTime }) => {
    const [timeRemaining, setTimeRemaining] = useState(15 * 60) // 15 minutes in seconds

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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getDisplayEmail = () => {
        if (!userEmail) return ''
        const storedData = localStorage.getItem("userInfo");
        if (storedData) {
            const userData = JSON.parse(storedData);
            return userData.name ? userData.name : userEmail.split('@')[0];
        }
        return userEmail.split('@')[0]
    }

    return (
        <header className="topbar">
            <div className="topbar-content">
                <div className="topbar-left">
                    <h1 className="domain-name">ग्राम समृद्धि</h1>
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
                                <span className="user-email">{getDisplayEmail()}</span>
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