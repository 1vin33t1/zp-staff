import React from 'react'
import './TopBar.css'

const TopBar = ({ isAuthenticated, userEmail, onLogout }) => {
    return (
        <header className="topbar">
            <div className="topbar-content">
                <div className="topbar-left">
                    <h1 className="domain-name">ग्राम समृद्धि</h1>
                </div>

                <nav className="topbar-nav">
                    {isAuthenticated && (
                        <>
                            <a href="/zp-staff/dashboard" className="nav-link">Dashboard</a>
                            {/* Future page links will go here */}
                        </>
                    )}
                </nav>

                <div className="topbar-right">
                    {isAuthenticated ? (
                        <div className="user-section">
                            <span className="user-email">{userEmail}</span>
                            <button onClick={onLogout} className="logout-btn">Logout</button>
                        </div>
                    ) : (
                        <span className="login-text">Login</span>
                    )}
                </div>
            </div>
        </header>
    )
}

export default TopBar