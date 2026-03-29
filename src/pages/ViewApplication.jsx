import React, {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import './ViewApplication.css'

const ViewApplication = () => {
    const navigate = useNavigate()
    const [applications, setApplications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchApplications()
    }, [])

    const fetchApplications = async () => {
        const token = localStorage.getItem('staffAccessToken')

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/applications', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.result && data.data && data.data.applicationList) {
                setApplications(data.data.applicationList)
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError('Failed to load applications. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'open':
                return 'status-open'
            case 'closed':
                return 'status-closed'
            case 'merit list pending':
                return 'status-pending'
            case 'selection pending':
                return 'status-pending'
            default:
                return 'status-default'
        }
    }

    const handleViewApplicants = (applicationId, allowView) => {
        if (allowView) {
            navigate(`/zp-staff/${applicationId}/applicants`)
        }
    }

    const handleEditApplication = (applicationId, allowEdit) => {
        if (allowEdit) {
            navigate(`/zp-staff/${applicationId}/edit`)
        }
    }

    const handleViewDetails = (descriptionUrl) => {
        window.open(descriptionUrl, '_blank')
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading applications...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="view-applications-container">
                <div className="page-header">
                    <h1>All Applications</h1>
                    <p>View and manage all application submissions</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {applications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>No applications found</p>
                        <button
                            className="primary-btn"
                            onClick={() => navigate('/zp-staff/create-application')}
                        >
                            Create New Application
                        </button>
                    </div>
                ) : (
                    <div className="applications-list">
                        {applications.map((app) => (
                            <div key={app.id} className="application-card">
                                <div className="card-banner">
                                    <img
                                        src={app.bannerImgUrl}
                                        alt="Application Banner"
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/800x200?text=Banner+Image'
                                        }}
                                    />
                                </div>

                                <div className="card-content">
                                    <div className="card-details">

                                        <div className="detail-row">
                                            <span className="detail-label">Application Name:</span>
                                            <span className="detail-value">{app.name}</span>
                                        </div>

                                        <div className="detail-row">
                                            <span className="detail-label">Taluka:</span>
                                            <span className="detail-value">{app.taluka}</span>
                                        </div>

                                        <div className="detail-row">
                                            <span className="detail-label">Village :</span>
                                            <span className="detail-value">{app.villageList.join(", ")}</span>
                                        </div>

                                        <div className="detail-row">
                                            <span className="detail-label">Applicant Count :</span>
                                            <span className="detail-value">{app.applicantCount}</span>
                                        </div>

                                        <div className="detail-row">
                                            <span className="detail-label">Start Date:</span>
                                            <span className="detail-value">{formatDate(app.startDate)}</span>
                                        </div>

                                        <div className="detail-row">
                                            <span className="detail-label">End Date:</span>
                                            <span className="detail-value">{formatDate(app.endDate)}</span>
                                        </div>

                                        <div className="detail-row">
                                            <span className="detail-label">Status:</span>
                                            <span className={`status-badge ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                                        </div>
                                    </div>

                                    <div className="card-actions">
                                        <button
                                            className="apply-btn btn-view-applicants"
                                            onClick={() => handleViewApplicants(app.id, app.allowViewApplicants)}
                                            disabled={!app.allowViewApplicants}
                                        >
                                            View Applicants
                                        </button>

                                        <button
                                            className={`apply-btn btn-edit-application ${!app.allowEdit ? 'disabled' : ''}`}
                                            onClick={() => handleEditApplication(app.id, app.allowEdit)}
                                            disabled={!app.allowEdit}
                                        >
                                            Edit Application
                                        </button>

                                        <button
                                            className="apply-btn btn-view-details"
                                            onClick={() => handleViewDetails(app.descriptionUrl)}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default ViewApplication
