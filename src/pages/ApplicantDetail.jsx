import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ApplicantDetail.css'

const ApplicantDetail = () => {
    const { applicationId, applicantId } = useParams()
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        applicationId: '',
        userId: '',
        rows: [],
        overallStatus: 'Pending',
        overallStatusComment: '',
        sendEmail: false
    })
    const [validationErrors, setValidationErrors] = useState({})
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    useEffect(() => {
        fetchApplicantData()
    }, [applicationId, applicantId])

    const fetchApplicantData = async () => {
        const token = localStorage.getItem('staffAccessToken')

        try {
            const response = await fetch(
                `https://api.gramsamruddhi.in/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            )

            const data = await response.json()

            if (data.result && data.data) {
                setFormData({
                    applicationId: data.data.applicationId,
                    userId: data.data.userId,
                    rows: data.data.rows.map(row => ({
                        ...row,
                        statusReason: row.statusReason || ''
                    })),
                    overallStatus: data.data.overallStatus || 'Pending',
                    overallStatusComment: data.data.overallStatusComment || '',
                    sendEmail: false
                })
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError('Failed to load applicant data. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleRowStatusChange = (rowIndex, status) => {
        const updatedRows = [...formData.rows]
        updatedRows[rowIndex].status = status

        if (status !== 'Reject') {
            updatedRows[rowIndex].statusReason = ''
        }

        setFormData({ ...formData, rows: updatedRows })

        // Clear validation error
        const errorKey = `row-${rowIndex}-statusReason`
        if (validationErrors[errorKey]) {
            const newErrors = { ...validationErrors }
            delete newErrors[errorKey]
            setValidationErrors(newErrors)
        }

        // Auto-calculate overall status
        calculateOverallStatus(updatedRows)
    }

    const calculateOverallStatus = (rows) => {
        // Check if all rows with documents are approved
        const rowsWithDocs = rows.filter(row => row.documentProofUrl && row.documentProofUrl.trim() !== '')
        const allApproved = rowsWithDocs.length > 0 && rowsWithDocs.every(row => row.status === 'Approve' || row.status === 'Reject' )

        if (allApproved) {
            setFormData(prev => ({ ...prev, overallStatus: 'Fully Verified' }))
        } else if (formData.overallStatus === 'Fully Verified') {
            // Deselect Fully Verified if not all approved
            setFormData(prev => ({ ...prev, overallStatus: 'Pending' }))
        }
    }

    const handleOverallStatusChange = (status) => {
        // Don't allow manual selection of Fully Verified
        if (status === 'Fully Verified') return

        setFormData({ ...formData, overallStatus: status })

        // Clear validation errors for overall status
        if (validationErrors['overallStatusComment']) {
            const newErrors = { ...validationErrors }
            delete newErrors['overallStatusComment']
            setValidationErrors(newErrors)
        }
    }

    const handleRowFieldChange = (rowIndex, field, value) => {
        const updatedRows = [...formData.rows]
        updatedRows[rowIndex][field] = value
        setFormData({ ...formData, rows: updatedRows })

        // Clear validation error for this field
        const errorKey = `row-${rowIndex}-${field}`
        if (validationErrors[errorKey]) {
            const newErrors = { ...validationErrors }
            delete newErrors[errorKey]
            setValidationErrors(newErrors)
        }
    }

    const validateForm = () => {
        const errors = {}

        // Validate each row (only rows with documents need status)
        formData.rows.forEach((row, index) => {
            // Only validate status if document exists
            if (row.documentProofUrl && row.documentProofUrl.trim() !== '') {
                // Check if status is selected
                if (!row.status) {
                    errors[`row-${index}-status`] = 'Please select a status'
                }

                // Check if status reason is required
                if ((row.status === 'Reject') &&
                    (!row.statusReason || row.statusReason.trim().length < 10)) {
                    errors[`row-${index}-statusReason`] = 'Please provide a reason (minimum 10 characters)'
                }
            }
        })

        // Validate overall status comment
        if ((formData.overallStatus === 'Reject Candidate') &&
            (!formData.overallStatusComment || formData.overallStatusComment.trim().length < 20)) {
            errors['overallStatusComment'] = 'Please provide a comment (minimum 20 characters)'
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSubmit = () => {
        if (!validateForm()) {
            setError('Please fix all validation errors before submitting')
            // Scroll to action buttons area
            const actionButtons = document.querySelector('.action-section')
            if (actionButtons) {
                actionButtons.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }
            return
        }

        setError('')
        setShowDisclaimer(true)
    }

    const handleConfirmSubmit = async () => {
        setShowDisclaimer(false)
        setSubmitting(true)
        setError('')

        const token = localStorage.getItem('staffAccessToken')

        try {
            const response = await fetch(
                `https://api.gramsamruddhi.in/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                }
            )

            const data = await response.json()

            if (data.result && data.data === 'success') {
                setSubmitSuccess(true)
                setTimeout(() => {
                    navigate(`/zp-staff/${applicationId}/applicants`)
                }, 3000)
            } else {
                throw new Error('Submission failed')
            }
        } catch (err) {
            setError('Failed to submit verification. Please try again.')
            setSubmitting(false)
        }
    }

    const renderFieldInput = (row, rowIndex, fieldNum) => {
        const keyField = `key${fieldNum}`
        const valueField = `value${fieldNum}`
        const valueTypeField = `valueType${fieldNum}`

        if (!row[keyField]) return null

        const valueType = row[valueTypeField]
        const value = row[valueField]

        if (valueType === 'textbox') {
            return (
                <div className="field-display">{value}</div>
            )
        } else if (valueType === 'bigtextbox') {
            return (
                <div className="field-display multiline">{value}</div>
            )
        } else if (valueType === 'checkbox') {
            return (
                <div className="checkbox-display">
                    {value === 'Yes' ? '✓ Yes' : '✗ No'}
                </div>
            )
        } else if(valueType === 'image') {
            return (
                <div className="resume-photo">
                    <img src={value} alt="profile photo" />
                </div>
            )
        }else {
            return <div className="field-display">{value}</div>
        }
    }

    const getDocumentUrl = (url) => {
        if (!url) return ''
        // Add prefix if not already present
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url
        }
        return `https://files.gramsamruddhi.in/${url}`
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading applicant data...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (submitSuccess) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="success-state">
                        <div className="success-icon-large">✓</div>
                        <h2>Verification Successfully Submitted</h2>
                        <p>Redirecting to applicants list...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="applicant-detail-container">
                {/* Header */}
                <div className="detail-header">
                    <div className="header-left">
                        <h2>Application ID</h2>
                        <p className="application-id">{formData.applicationId}</p>
                    </div>
                    <div className="header-right">
                        <h2>Applicant ID</h2>
                        <p className="applicant-id">{formData.userId}</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="history-btn"
                            onClick={() => navigate(`/zp-staff/${applicationId}/applicants/${applicantId}/history`)}
                        >
                            📜 History
                        </button>
                    </div>
                </div>

                <div className="divider"></div>

                {error && <div className="error-message">{error}</div>}

                {/* Rows */}
                <div className="rows-container">
                    {formData.rows.map((row, rowIndex) => (
                        <div key={rowIndex} className="row-card">
                            {/* Field 1 */}
                            <div className="field-group">
                                <label className="field-label">{row.key1}:</label>
                                {renderFieldInput(row, rowIndex, 1)}
                            </div>

                            {/* Field 2 (if exists) */}
                            {row.key2 && (
                                <div className="field-group">
                                    <label className="field-label">{row.key2}:</label>
                                    {renderFieldInput(row, rowIndex, 2)}
                                </div>
                            )}

                            {/* Field 3 (if exists) */}
                            {row.key3 && (
                                <div className="field-group">
                                    <label className="field-label">{row.key3}:</label>
                                    {renderFieldInput(row, rowIndex, 3)}
                                </div>
                            )}

                            {/* Field 4 (if exists) */}
                            {row.key4 && (
                                <div className="field-group">
                                    <label className="field-label">{row.key4}:</label>
                                    {renderFieldInput(row, rowIndex, 4)}
                                </div>
                            )}

                            {/* Document Proof */}
                            {row.documentProofUrl && row.documentProofUrl.trim() !== '' && (
                                <div className="field-group">
                                    <label className="field-label">Document Proof:</label>
                                    <button
                                        className="document-btn"
                                        onClick={() => window.open(getDocumentUrl(row.documentProofUrl), '_blank')}
                                    >
                                        📄 View Document
                                    </button>
                                </div>
                            )}

                            {/* Status Buttons - Only show if document exists */}
                            {row.documentProofUrl && row.documentProofUrl.trim() !== '' && (
                                <>
                                    <div className="field-group">
                                        <label className="field-label">Verification Status:</label>
                                        <div className="status-buttons">
                                            <button
                                                className={`status-btn approve ${row.status === 'Approve' ? 'selected' : ''}`}
                                                onClick={() => handleRowStatusChange(rowIndex, 'Approve')}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className={`status-btn reject ${row.status === 'Reject' ? 'selected' : ''}`}
                                                onClick={() => handleRowStatusChange(rowIndex, 'Reject')}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                className={`status-btn not-verified ${row.status === 'Not Verified' ? 'selected' : ''}`}
                                                onClick={() => handleRowStatusChange(rowIndex, 'Not Verified')}
                                            >
                                                Not Verified
                                            </button>
                                        </div>
                                        {validationErrors[`row-${rowIndex}-status`] && (
                                            <div className="field-error">{validationErrors[`row-${rowIndex}-status`]}</div>
                                        )}
                                    </div>

                                    {/* Status Reason (conditional) */}
                                    {(row.status === 'Reject' || row.statusReason) && (
                                        <div className="field-group">
                                            <label className="field-label">
                                                Reason {(row.status === 'Reject') && <span className="required">*</span>}:
                                            </label>
                                            <textarea
                                                value={row.statusReason}
                                                onChange={(e) => handleRowFieldChange(rowIndex, 'statusReason', e.target.value)}
                                                className="reason-textarea"
                                                rows="2"
                                                placeholder="Enter reason (minimum 10 characters)"
                                            />
                                            {validationErrors[`row-${rowIndex}-statusReason`] && (
                                                <div className="field-error">{validationErrors[`row-${rowIndex}-statusReason`]}</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="divider"></div>

                {/* Overall Status */}
                <div className="overall-section">
                    <h3 className="section-title">Overall Verification Status</h3>

                    <div className="overall-status-buttons">
                        <button
                            className={`overall-btn fully-verified ${formData.overallStatus === 'Fully Verified' ? 'selected' : ''} disabled`}
                            disabled
                            title="Auto-selected when all documents are approved"
                        >
                            Fully Verified (Auto)
                        </button>
                        <button
                            className={`overall-btn reject-candidate ${formData.overallStatus === 'Reject Candidate' ? 'selected' : ''}`}
                            onClick={() => handleOverallStatusChange('Reject Candidate')}
                        >
                            Reject Candidate
                        </button>
                        <button
                            className={`overall-btn pending ${formData.overallStatus === 'Pending' ? 'selected' : ''}`}
                            onClick={() => handleOverallStatusChange('Pending')}
                        >
                            Pending
                        </button>
                    </div>

                    {/* Overall Comment */}
                    <div className="field-group">
                        <label className="field-label">
                            Overall Comment
                            {(formData.overallStatus === 'Reject Candidate') &&
                                <span className="required">*</span>}:
                        </label>
                        <textarea
                            value={formData.overallStatusComment}
                            onChange={(e) => setFormData({ ...formData, overallStatusComment: e.target.value })}
                            className="overall-comment-textarea"
                            rows="4"
                            placeholder={
                                (formData.overallStatus === 'Reject Candidate')
                                    ? 'Enter comment (minimum 20 characters)'
                                    : 'Enter any additional comments'
                            }
                        />
                        {validationErrors['overallStatusComment'] && (
                            <div className="field-error">{validationErrors['overallStatusComment']}</div>
                        )}
                    </div>

                    {/* Send Email Checkbox */}
                    {(formData.overallStatus === 'Reject Candidate') && (
                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.sendEmail}
                                    onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                                />
                                <span>Send email notification to applicant</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Action Section with Validation Errors */}
                <div className="action-section">
                    {Object.keys(validationErrors).length > 0 && (
                        <div className="validation-error-popup">
                            <strong>⚠️ Please fix the following errors:</strong>
                            <ul>
                                {Object.values(validationErrors).map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="action-buttons">
                        <button
                            className="secondary-btn"
                            onClick={() => navigate(`/zp-staff/${applicationId}/applicants`)}
                            disabled={submitting}
                        >
                            Go to Applicant List Page
                        </button>

                        <button
                            className="primary-btn"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Verification'}
                        </button>
                    </div>
                </div>

                {/* Disclaimer Modal */}
                {showDisclaimer && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirm Verification Submission</h3>
                            <p>Please recheck all the data before submitting the verification. This action will update the applicant's status and cannot be easily reversed.</p>
                            <div className="disclaimer-details">
                                <p><strong>Overall Status:</strong> {formData.overallStatus}</p>
                                {formData.overallStatusComment && (
                                    <p><strong>Comment:</strong> {formData.overallStatusComment}</p>
                                )}
                                {formData.sendEmail && (
                                    <p><strong>Email:</strong> Will be sent to applicant</p>
                                )}
                            </div>
                            <div className="modal-actions">
                                <button
                                    className="secondary-btn"
                                    onClick={() => setShowDisclaimer(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="primary-btn"
                                    onClick={handleConfirmSubmit}
                                >
                                    Confirm & Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ApplicantDetail
