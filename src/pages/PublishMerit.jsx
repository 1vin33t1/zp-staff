import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './PublishMerit.css'

const PublishMerit = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [candidates, setCandidates] = useState([])
    const [selectedCandidates, setSelectedCandidates] = useState(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    const [sortColumn, setSortColumn] = useState('sno')
    const [sortDirection, setSortDirection] = useState('asc')
    const itemsPerPage = 10

    // Stage management
    const [stage, setStage] = useState('selection') // selection, upload, publish

    // Upload state
    const [meritListAsset, setMeritListAsset] = useState('')
    const [uploadingMeritList, setUploadingMeritList] = useState(false)
    const [letterAssets, setLetterAssets] = useState({}) // { userId: assetName }
    const [uploadingLetter, setUploadingLetter] = useState({}) // { userId: boolean }

    // Publish state
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishSuccess, setPublishSuccess] = useState(false)

    useEffect(() => {
        fetchEligibleCandidates()
    }, [applicationId])

    const fetchEligibleCandidates = async () => {
        const token = localStorage.getItem('accessToken')

        try {
            const response = await fetch(
                `https://api.gramsamruddhi.in/zp-staff/${applicationId}/eligible-candidates`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (data.result && data.data) {
                setCandidates(data.data.applicants || [])
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError('Failed to load eligible candidates. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleCheckboxChange = (userId) => {
        const newSelected = new Set(selectedCandidates)
        if (newSelected.has(userId)) {
            newSelected.delete(userId)
        } else {
            newSelected.add(userId)
        }
        setSelectedCandidates(newSelected)
    }

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const getSortIcon = (column) => {
        if (sortColumn !== column) return '⇅'
        return sortDirection === 'asc' ? '↑' : '↓'
    }

    const getSortedCandidates = () => {
        let sorted = [...candidates]

        // In upload stage, only show selected candidates
        if (stage === 'upload') {
            sorted = sorted.filter(c => selectedCandidates.has(c.id))
        }

        sorted.sort((a, b) => {
            let aVal = a[sortColumn]
            let bVal = b[sortColumn]

            if (sortColumn === 'merit') {
                aVal = parseFloat(aVal) || 0
                bVal = parseFloat(bVal) || 0
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase()
                bVal = bVal.toLowerCase()
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return sorted
    }

    const sortedCandidates = getSortedCandidates()
    const totalPages = Math.ceil(sortedCandidates.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentCandidates = sortedCandidates.slice(startIndex, endIndex)

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1)
    }

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1)
    }

    const handleProceedToUpload = () => {
        if (selectedCandidates.size === 0) {
            setError('Please select at least one candidate')
            return
        }
        setError('')
        setStage('upload')
        setCurrentPage(1)
    }

    const handleBackToSelection = () => {
        setStage('selection')
        setCurrentPage(1)
    }

    const handleFileUpload = async (file, type, userId = null) => {
        const token = localStorage.getItem('accessToken')

        if (type === 'meritList') {
            setUploadingMeritList(true)
        } else {
            setUploadingLetter({ ...uploadingLetter, [userId]: true })
        }

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('https://api.gramsamruddhi.in/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Bucket-Name': 'public'
                },
                body: formData
            })

            const data = await response.json()

            if (data.result && data.data) {
                if (type === 'meritList') {
                    setMeritListAsset(data.data)
                } else {
                    setLetterAssets({ ...letterAssets, [userId]: data.data })
                }
            } else {
                throw new Error('Upload failed')
            }
        } catch (err) {
            setError(`Failed to upload ${type === 'meritList' ? 'merit list' : 'letter'}. Please try again.`)
        } finally {
            if (type === 'meritList') {
                setUploadingMeritList(false)
            } else {
                setUploadingLetter({ ...uploadingLetter, [userId]: false })
            }
        }
    }

    const canPublish = () => {
        if (!meritListAsset) return false

        const selectedArray = Array.from(selectedCandidates)
        return selectedArray.every(userId => letterAssets[userId])
    }

    const handlePublishClick = () => {
        if (!canPublish()) {
            setError('Please upload merit list and all letters before publishing')
            return
        }
        setError('')
        setShowDisclaimer(true)
    }

    const handleConfirmPublish = async () => {
        setShowDisclaimer(false)
        setPublishing(true)
        setError('')

        const token = localStorage.getItem('accessToken')

        const meritUsers = Array.from(selectedCandidates).map(userId => {
            const candidate = candidates.find(c => c.id === userId)
            return {
                userId: candidate.id,
                name: candidate.name,
                letterAsset: letterAssets[userId]
            }
        })

        const payload = {
            applicationId,
            meritListAsset,
            meritUsers
        }

        try {
            const response = await fetch(
                `https://api.gramsamruddhi.in/zp-staff/${applicationId}/publish-merit-list`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }
            )

            const data = await response.json()

            if (data.result && data.data === 'success') {
                setPublishSuccess(true)
                setTimeout(() => {
                    navigate('/zp-staff/dashboard')
                }, 3000)
            } else {
                throw new Error('Publish failed')
            }
        } catch (err) {
            setError('Failed to publish merit list. Please try again.')
            setPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading eligible candidates...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (publishSuccess) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="success-state">
                        <div className="success-icon-large">✓</div>
                        <h2>Merit List Successfully Published</h2>
                        <p>Redirecting to dashboard...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="publish-merit-container">
                {/* Header */}
                <div className="page-header">
                    <h1>Publish Merit List</h1>
                    <p className="application-id">Application ID: <strong>{applicationId}</strong></p>
                    <div className="stage-indicator">
                        <span className={`stage ${stage === 'selection' ? 'active' : 'completed'}`}>1. Select Candidates</span>
                        <span className="stage-separator">→</span>
                        <span className={`stage ${stage === 'upload' ? 'active' : stage === 'selection' ? '' : 'completed'}`}>2. Upload Documents</span>
                        <span className="stage-separator">→</span>
                        <span className={`stage ${stage === 'publish' ? 'active' : ''}`}>3. Publish</span>
                    </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Results count */}
                <div className="results-info">
                    {stage === 'selection' ? (
                        <>Showing {startIndex + 1} - {Math.min(endIndex, sortedCandidates.length)} of {sortedCandidates.length} eligible candidates ({selectedCandidates.size} selected)</>
                    ) : (
                        <>Showing {startIndex + 1} - {Math.min(endIndex, sortedCandidates.length)} of {selectedCandidates.size} selected candidates</>
                    )}
                </div>

                {/* Merit List Upload (Upload stage only) */}
                {stage === 'upload' && (
                    <div className="merit-list-upload-section">
                        <h3>Upload Merit List Document</h3>
                        <div className="upload-box">
                            <input
                                type="file"
                                id="meritListFile"
                                onChange={(e) => handleFileUpload(e.target.files[0], 'meritList')}
                                accept=".pdf,.doc,.docx"
                                disabled={uploadingMeritList}
                                className="file-input"
                            />
                            <label htmlFor="meritListFile" className={`upload-label ${meritListAsset ? 'uploaded' : ''}`}>
                                {uploadingMeritList ? (
                                    <span>⏳ Uploading...</span>
                                ) : meritListAsset ? (
                                    <span>✓ Uploaded: {meritListAsset} (Click to change)</span>
                                ) : (
                                    <span>📄 Click to Upload Merit List</span>
                                )}
                            </label>
                        </div>
                    </div>
                )}

                {/* Table */}
                {sortedCandidates.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <p>No {stage === 'upload' ? 'selected' : 'eligible'} candidates found</p>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="candidates-table">
                                <thead>
                                <tr>
                                    {stage === 'selection' && <th>Select</th>}
                                    <th onClick={() => handleSort('sno')} className="sortable">
                                        S.NO {getSortIcon('sno')}
                                    </th>
                                    <th onClick={() => handleSort('id')} className="sortable">
                                        ID {getSortIcon('id')}
                                    </th>
                                    <th onClick={() => handleSort('name')} className="sortable">
                                        Name {getSortIcon('name')}
                                    </th>
                                    <th onClick={() => handleSort('pincode')} className="sortable">
                                        Pincode {getSortIcon('pincode')}
                                    </th>
                                    <th onClick={() => handleSort('merit')} className="sortable">
                                        Merit {getSortIcon('merit')}
                                    </th>
                                    <th onClick={() => handleSort('status')} className="sortable">
                                        Status {getSortIcon('status')}
                                    </th>
                                    {stage === 'upload' && <th>Upload Letter</th>}
                                </tr>
                                </thead>
                                <tbody>
                                {currentCandidates.map((candidate, index) => (
                                    <tr key={candidate.id}>
                                        {stage === 'selection' && (
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCandidates.has(candidate.id)}
                                                    onChange={() => handleCheckboxChange(candidate.id)}
                                                    className="checkbox-input"
                                                />
                                            </td>
                                        )}
                                        <td>{startIndex + index + 1}</td>
                                        <td className="id-cell">{candidate.id}</td>
                                        <td>{candidate.name}</td>
                                        <td>{candidate.pincode}</td>
                                        <td>{candidate.merit}</td>
                                        <td>
                        <span className="status-badge status-verified">
                          {candidate.status}
                        </span>
                                        </td>
                                        {stage === 'upload' && (
                                            <td>
                                                <div className="upload-letter-cell">
                                                    <input
                                                        type="file"
                                                        id={`letter-${candidate.id}`}
                                                        onChange={(e) => handleFileUpload(e.target.files[0], 'letter', candidate.id)}
                                                        accept=".pdf"
                                                        disabled={uploadingLetter[candidate.id]}
                                                        className="file-input-hidden"
                                                    />
                                                    <label htmlFor={`letter-${candidate.id}`} className={`upload-letter-btn ${letterAssets[candidate.id] ? 'uploaded' : ''}`}>
                                                        {uploadingLetter[candidate.id] ? (
                                                            'Uploading...'
                                                        ) : letterAssets[candidate.id] ? (
                                                            '🔄 Change'
                                                        ) : (
                                                            '📤 Upload'
                                                        )}
                                                    </label>
                                                    {letterAssets[candidate.id] && (
                                                        <div className="asset-name">{letterAssets[candidate.id]}</div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button onClick={handlePrevPage} disabled={currentPage === 1} className="pagination-btn">
                                    Previous
                                </button>
                                <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                                <button onClick={handleNextPage} disabled={currentPage === totalPages} className="pagination-btn">
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button
                        className="secondary-btn"
                        onClick={() => navigate(`/zp-staff/${applicationId}/applicants`)}
                        disabled={publishing}
                    >
                        ← Back to Applicant List
                    </button>

                    {stage === 'selection' && (
                        <button
                            className="primary-btn"
                            onClick={handleProceedToUpload}
                            disabled={selectedCandidates.size === 0}
                        >
                            Next →
                        </button>
                    )}

                    {stage === 'upload' && (
                        <>
                            <button
                                className="secondary-btn"
                                onClick={handleBackToSelection}
                            >
                                ← Back
                            </button>
                            <button
                                className="publish-btn"
                                onClick={handlePublishClick}
                                disabled={!canPublish() || publishing}
                            >
                                {publishing ? 'Publishing...' : 'Publish Merit List'}
                            </button>
                        </>
                    )}
                </div>

                {/* Disclaimer Modal */}
                {showDisclaimer && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>⚠️ Confirm Merit List Publication</h3>
                            <div className="disclaimer-text">
                                <p><strong>Important:</strong> After successful merit publication:</p>
                                <ul>
                                    <li>✉️ Letters will be sent to all selected applicants</li>
                                    <li>📋 Merit list will be displayed on the applicants' home page</li>
                                    <li>🚫 <strong>This action CANNOT be reversed once published</strong></li>
                                </ul>
                                <p>Please verify all information carefully before proceeding.</p>
                            </div>
                            <div className="modal-actions">
                                <button className="secondary-btn" onClick={() => setShowDisclaimer(false)}>
                                    Cancel
                                </button>
                                <button className="danger-btn" onClick={handleConfirmPublish}>
                                    Yes, Publish Merit List
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PublishMerit
