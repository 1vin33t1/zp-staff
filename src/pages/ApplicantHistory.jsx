import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import './ApplicantHistory.css'

const ApplicantHistory = () => {
    const { applicationId, applicantId } = useParams()
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [historyData, setHistoryData] = useState([])
    const [filteredData, setFilteredData] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchHistory()
    }, [applicationId, applicantId])

    useEffect(() => {
        filterHistory()
    }, [searchQuery, historyData])

    const fetchHistory = async () => {
        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}/history`,
                {
                    method: 'GET',
                    headers: createAuthHeaders(),
                },
            )

            if (data.result && data.data) {
                setHistoryData(data.data)
                setFilteredData(data.data)
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError('Failed to load history. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const filterHistory = () => {
        if (!searchQuery.trim()) {
            setFilteredData(historyData)
            return
        }

        const query = searchQuery.toLowerCase()
        const filtered = historyData.filter(message =>
            message && message.toLowerCase().includes(query)
        )
        setFilteredData(filtered)
    }

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
    }

    const clearSearch = () => {
        setSearchQuery('')
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading activity history...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="history-container">
                {/* Header */}
                <div className="history-header">
                    <h1>Activity History</h1>
                    <div className="header-info">
                        <span className="info-label">Application ID:</span>
                        <span className="info-value">{applicationId}</span>
                        <span className="info-separator">•</span>
                        <span className="info-label">Applicant ID:</span>
                        <span className="info-value">{applicantId}</span>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Search Bar */}
                <div className="search-section">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            placeholder="Search activity history..."
                            className="search-input"
                        />
                        {searchQuery && (
                            <button className="clear-search-btn" onClick={clearSearch}>
                                ✕
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <div className="search-results-info">
                            Found {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                {/* Activity Stream */}
                <div className="activity-stream">
                    {filteredData.length === 0 ? (
                        <div className="empty-state">
                            {searchQuery ? (
                                <>
                                    <div className="empty-icon">🔍</div>
                                    <p>No results found for "{searchQuery}"</p>
                                    <button className="secondary-btn" onClick={clearSearch}>
                                        Clear Search
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="empty-icon">📋</div>
                                    <p>No activity history available</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="message-list">
                            {filteredData.map((message, index) => (
                                <div key={index} className="message-card">
                                    <div className="message-number">#{index + 1}</div>
                                    <div className="message-content">{message}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className="secondary-btn"
                        onClick={() => navigate(`/zp-staff/${applicationId}/applicants`)}
                    >
                        ← Back to Applicant List
                    </button>

                    <button
                        className="primary-btn"
                        onClick={() => navigate(`/zp-staff/${applicationId}/applicants/${applicantId}`)}
                    >
                        Back to Verification →
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ApplicantHistory
