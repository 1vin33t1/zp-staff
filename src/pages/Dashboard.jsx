import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const Dashboard = () => {
    const navigate = useNavigate()

    const cards = [
        {
            title: 'Create Application',
            description: 'Start a new application process',
            icon: '📝',
            route: '/zp-staff/create-application',
            color: '#3b82f6'
        },
        {
            title: 'View Applications',
            description: 'View and manage existing applications',
            icon: '📋',
            route: '/zp-staff/view-application',
            color: '#10b981'
        },
        {
            title: 'Profile',
            description: 'Manage your profile settings',
            icon: '👤',
            route: '/zp-staff/profile',
            color: '#f59e0b'
        }
    ]

    return (
        <div className="dashboard-container">
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>ZP Staff Dashboard</h1>
                    <p>Welcome to your portal. Select an option below to get started.</p>
                </div>

                <div className="dashboard-cards">
                    {cards.map((card, index) => (
                        <div
                            key={index}
                            className="dashboard-card"
                            onClick={() => navigate(card.route)}
                            style={{ '--card-color': card.color }}
                        >
                            <div className="card-icon">{card.icon}</div>
                            <h3 className="card-title">{card.title}</h3>
                            <p className="card-description">{card.description}</p>
                            <div className="card-arrow">→</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Dashboard