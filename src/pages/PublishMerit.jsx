import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson, uploadPublicFile } from '../lib/api'
import ConfirmModal from '../components/ui/ConfirmModal'
import EmptyState from '../components/ui/EmptyState'
import InlineMessage from '../components/ui/InlineMessage'
import PageLoader from '../components/ui/PageLoader'
import PageSuccessState from '../components/ui/PageSuccessState'
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
    const [origMeritListAsset, setOrigMeritListAsset] = useState('')

    const [uploadingMeritList, setUploadingMeritList] = useState(false)
    const [letterAssets, setLetterAssets] = useState({}) // { userId: assetName }
    const [origLetterAssets, setOrigLetterAssets] = useState({}) // { userId: assetName }
    const [uploadingLetter, setUploadingLetter] = useState({}) // { userId: boolean }

    // Publish state
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishSuccess, setPublishSuccess] = useState(false)

    useEffect(() => {
        fetchEligibleCandidates()
    }, [applicationId])

    const fetchEligibleCandidates = async () => {
        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/eligible-candidates`,
                {
                    method: 'GET',
                    headers: createAuthHeaders(),
                },
            )

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
        if (!file) {
            return
        }

        if (type === 'meritList') {
            setUploadingMeritList(true)
        } else {
            setUploadingLetter((previousValue) => ({ ...previousValue, [userId]: true }))
        }

        try {
            const data = await uploadPublicFile(file)

            if (data.result && data.data) {
                if (type === 'meritList') {
                    setMeritListAsset(data.data)
                    setOrigMeritListAsset(file.name)
                } else {
                    setLetterAssets((previousValue) => ({ ...previousValue, [userId]: data.data }))
                    setOrigLetterAssets((previousValue) => ({ ...previousValue, [userId]: file.name }))
                }
            } else {
                throw new Error('Upload failed')
            }
        } catch (err) {
            setError(`Failed to upload ${type === 'meritList' ? 'preliminary result' : 'letter'}. Please try again.`)
        } finally {
            if (type === 'meritList') {
                setUploadingMeritList(false)
            } else {
                setUploadingLetter((previousValue) => ({ ...previousValue, [userId]: false }))
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
            setError('Please upload preliminary result and all letters before publishing')
            return
        }
        setError('')
        setShowDisclaimer(true)
    }

    const handleConfirmPublish = async () => {
        setShowDisclaimer(false)
        setPublishing(true)
        setError('')

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
            const data = await fetchJson(
                `/zp-staff/${applicationId}/publish-prelim-list`,
                {
                    method: 'POST',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(payload)
                },
            )

            if (data.result && data.data === 'success') {
                setPublishSuccess(true)
                setTimeout(() => {
                    navigate('/zp-staff/dashboard')
                }, 3000)
            } else {
                throw new Error('Publish failed')
            }
        } catch (err) {
            setError('Failed to publish preliminary result. Please try again.')
            setPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageLoader message="Loading eligible candidates..." />
                </div>
            </div>
        )
    }

    if (publishSuccess) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageSuccessState
                        title="Preliminary Result Successfully Published"
                        description="Redirecting to dashboard..."
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="publish-merit-container">
                {/* Header */}
                <div className="page-header">
                    <h1>Publish Preliminary Result</h1>
                    <p className="application-id">Application ID: <strong>{applicationId}</strong></p>
                    <div className="stage-indicator">
                        <span className={`stage ${stage === 'selection' ? 'active' : 'completed'}`}>1. Select Candidates</span>
                        <span className="stage-separator">→</span>
                        <span className={`stage ${stage === 'upload' ? 'active' : stage === 'selection' ? '' : 'completed'}`}>2. Upload Documents</span>
                        <span className="stage-separator">→</span>
                        <span className={`stage ${stage === 'publish' ? 'active' : ''}`}>3. Publish</span>
                    </div>
                </div>

                <InlineMessage>{error}</InlineMessage>

                {/* Results count */}
                <div className="results-info">
                    {stage === 'selection' ? (
                        <>Showing {startIndex + 1} - {Math.min(endIndex, sortedCandidates.length)} of {sortedCandidates.length} eligible candidates ({selectedCandidates.size} selected)</>
                    ) : (
                        <>Showing {startIndex + 1} - {Math.min(endIndex, sortedCandidates.length)} of {selectedCandidates.size} selected candidates</>
                    )}
                </div>

                {/* Preliminary Result Upload (Upload stage only) */}
                {stage === 'upload' && (
                    <div className="merit-list-upload-section">
                        <h3>Upload Preliminary Result Document</h3>
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
                                    <span>✓ Uploaded: {origMeritListAsset} (Click to change)</span>
                                ) : (
                                    <span>📄 Click to Upload Preliminary Result</span>
                                )}
                            </label>
                        </div>
                    </div>
                )}

                {/* Table */}
                {sortedCandidates.length === 0 ? (
                    <EmptyState
                        icon="👥"
                        title={`No ${stage === 'upload' ? 'selected' : 'eligible'} candidates found`}
                        description={stage === 'upload'
                            ? 'Go back to the selection step and choose candidates to continue.'
                            : 'Eligible candidates will appear here once the application reaches the required stage.'}
                    />
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
                                                        <div className="asset-name">{origLetterAssets[candidate.id]}</div>
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
                                {publishing ? 'Publishing...' : 'Publish Preliminary Result'}
                            </button>
                        </>
                    )}
                </div>

                {/* Disclaimer Modal */}
                <ConfirmModal
                    isOpen={showDisclaimer}
                    title="Confirm Preliminary Result Publication"
                    description="Please verify all information carefully before proceeding."
                    details={(
                        <div className="disclaimer-text">
                            <p><strong>Important:</strong> After successful preliminary result publication:</p>
                            <ul>
                                <li>Letters will be sent to all selected applicants.</li>
                                <li>Preliminary result will be displayed on the applicants' home page.</li>
                                <li><strong>This action cannot be reversed once published.</strong></li>
                            </ul>
                        </div>
                    )}
                    confirmLabel="Yes, Publish Preliminary Result"
                    confirmButtonClassName="danger-btn"
                    onCancel={() => setShowDisclaimer(false)}
                    onConfirm={handleConfirmPublish}
                />
            </div>
        </div>
    )
}

export default PublishMerit
