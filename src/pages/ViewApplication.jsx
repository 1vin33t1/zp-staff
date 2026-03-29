import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import './ViewApplication.css'

const ViewApplication = () => {
    const navigate = useNavigate()
    const [applications, setApplications] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedTaluka, setSelectedTaluka] = useState('')
    const [selectedVillage, setSelectedVillage] = useState('')
    const [selectedStatus, setSelectedStatus] = useState('')

    useEffect(() => {
        fetchApplications()
    }, [])

    const fetchApplications = async () => {
        try {
            const data = await fetchJson('/zp-staff/applications', {
                method: 'GET',
                headers: createAuthHeaders(),
            })

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

    const naturalSort = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base'
    }).compare

    const talukaOptions = [...new Set(applications.map(app => app.taluka).filter(Boolean))]
        .sort(naturalSort)

    const villageOptions = [
        ...new Set(
            applications.flatMap(app => Array.isArray(app.villageList) ? app.villageList : []).filter(Boolean)
        )
    ].sort(naturalSort)

    const statusOptions = [...new Set(applications.map(app => app.status).filter(Boolean))]
        .sort(naturalSort)

    const filteredApplications = applications.filter(app => {
        const villages = Array.isArray(app.villageList) ? app.villageList : []

        const matchesTaluka = !selectedTaluka || app.taluka === selectedTaluka
        const matchesVillage = !selectedVillage || villages.includes(selectedVillage)
        const matchesStatus = !selectedStatus || app.status === selectedStatus

        return matchesTaluka && matchesVillage && matchesStatus
    })

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

                {applications.length > 0 && (
                    <div className="filters-section">
                        <div className="filter-group">
                            <label htmlFor="talukaFilter">Taluka</label>
                            <select
                                id="talukaFilter"
                                value={selectedTaluka}
                                onChange={(e) => setSelectedTaluka(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Taluka</option>
                                {talukaOptions.map((taluka) => (
                                    <option key={taluka} value={taluka}>
                                        {taluka}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="villageFilter">Village Name</label>
                            <select
                                id="villageFilter"
                                value={selectedVillage}
                                onChange={(e) => setSelectedVillage(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Villages</option>
                                {villageOptions.map((village) => (
                                    <option key={village} value={village}>
                                        {village}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="statusFilter">Status</label>
                            <select
                                id="statusFilter"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Status</option>
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {filteredApplications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>{applications.length === 0 ? 'No applications found' : 'No applications match the selected filters'}</p>
                        {applications.length === 0 && (
                            <button
                                className="primary-btn"
                                onClick={() => navigate('/zp-staff/create-application')}
                            >
                                Create New Application
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="applications-list">
                        {filteredApplications.map((app) => (
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
