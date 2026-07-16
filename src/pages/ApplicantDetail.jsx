import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson, toAbsoluteFileUrl } from '../lib/api'
import ConfirmModal from '../components/ui/ConfirmModal'
import InlineMessage from '../components/ui/InlineMessage'
import PageLoader from '../components/ui/PageLoader'
import PageSuccessState from '../components/ui/PageSuccessState'
import './ApplicantDetail.css'

const ApplicantDetail = () => {
    const { applicationId, applicantId } = useParams()
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [formData, setFormData] = useState({
        applicationId: '',
        userId: '',
        rows: [],
        overallStatus: 'Pending',
        overallStatusComment: '',
        sendEmail: false,
        flagRemark: '',
    })
    const [flagged, setFlagged] = useState(false)
    const [auditor, setAuditor] = useState(false)
    const [allowEdit, setAllowEdit] = useState(true)
    const [applicationLocked, setApplicationLocked] = useState(false)
    const [validationErrors, setValidationErrors] = useState({})
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [showFlagModal, setShowFlagModal] = useState(false)
    const [flagModalAction, setFlagModalAction] = useState('flag')
    const [flagComment, setFlagComment] = useState('')
    const [flagModalError, setFlagModalError] = useState('')
    const [flagActionLoading, setFlagActionLoading] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [manual12thModalOpen, setManual12thModalOpen] = useState(false)
    const [manual12thForm, setManual12thForm] = useState({ earned: '', total: '' })
    const [manual12thError, setManual12thError] = useState('')
    const [manual12thSubmitting, setManual12thSubmitting] = useState(false)
    const [manual12thSuccess, setManual12thSuccess] = useState(false)

    const applyApplicantData = useCallback((data) => {
        setFormData({
            applicationId: data.applicationId,
            userId: data.userId,
            rows: (Array.isArray(data.rows) ? data.rows : []).map(row => ({
                ...row,
                statusReason: row.statusReason || '',
                secondaryDocumentProofUrl: row.secondaryDocumentProofUrl || '',
            })),
            overallStatus: data.overallStatus || 'Pending',
            overallStatusComment: data.overallStatusComment || '',
            sendEmail: false,
            flagRemark: data.flagRemark || '',
        })
        setFlagged(Boolean(data.flagged))
        setAuditor(Boolean(data.auditor))
        setAllowEdit(data.allowEdit !== false)
        setApplicationLocked(Boolean(data.locked))
        setValidationErrors({})
    }, [])

    const fetchSeqRef = useRef(0)

    const fetchApplicantData = useCallback(async ({ showLoader = true } = {}) => {
        // Latest request wins: a slow response for a previous applicant must
        // not populate the form shown under the current URL.
        const requestId = ++fetchSeqRef.current

        if (showLoader) {
            setLoading(true)
        }

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}`,
                {
                    method: 'GET',
                    headers: createAuthHeaders(),
                },
            )

            if (requestId !== fetchSeqRef.current) {
                return
            }

            if (data.result && data.data) {
                setError('')
                applyApplicantData(data.data)
            } else {
                throw new Error('Invalid response format')
            }
        } catch {
            if (requestId === fetchSeqRef.current) {
                setError('Failed to load applicant data. Please try again.')
            }
        } finally {
            if (showLoader && requestId === fetchSeqRef.current) {
                setLoading(false)
            }
        }
    }, [applicantId, applicationId, applyApplicantData])

    useEffect(() => {
        fetchApplicantData()
    }, [fetchApplicantData])

    const redirectTimerRef = useRef(null)

    useEffect(() => () => {
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current)
        }
    }, [])

    const handleRowStatusChange = (rowIndex, status) => {
        if (!allowEdit) {
            return
        }

        const previousStatus = formData.rows[rowIndex].status
        const updatedRows = formData.rows.map((row, index) => (
            index === rowIndex
                ? {
                    ...row,
                    status,
                    statusReason: status === 'Reject' && previousStatus === 'Reject'
                        ? row.statusReason
                        : '',
                }
                : row
        ))

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
        // Check if all rows with documents have been processed (approved or rejected)
        const rowsWithDocs = rows.filter(row => row.documentProofUrl && row.documentProofUrl.trim() !== '')
        const allProcessed = rowsWithDocs.length > 0 && rowsWithDocs.every(row => row.status === 'Approve' || row.status === 'Reject')

        if (allProcessed) {
            // Never override an explicit rejection with the auto status.
            setFormData(prev => (
                prev.overallStatus === 'Reject Candidate'
                    ? prev
                    : { ...prev, overallStatus: 'Fully Verified' }
            ))
        } else {
            // Deselect Fully Verified if not all processed
            setFormData(prev => (
                prev.overallStatus === 'Fully Verified'
                    ? { ...prev, overallStatus: 'Pending' }
                    : prev
            ))
        }
    }

    const handleOverallStatusChange = (status) => {
        if (!allowEdit) {
            return
        }

        // Don't allow manual selection of Fully Verified
        if (status === 'Fully Verified') return

        setFormData({
            ...formData,
            overallStatus: status,
            overallStatusComment: status !== formData.overallStatus ? '' : formData.overallStatusComment,
            sendEmail: status === 'Reject Candidate' ? formData.sendEmail : false,
        })

        // Clear validation errors for overall status
        if (validationErrors['overallStatusComment']) {
            const newErrors = { ...validationErrors }
            delete newErrors['overallStatusComment']
            setValidationErrors(newErrors)
        }
    }

    const handleRowFieldChange = (rowIndex, field, value) => {
        if (!allowEdit) {
            return
        }

        const updatedRows = formData.rows.map((row, index) => (
            index === rowIndex ? { ...row, [field]: value } : row
        ))
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
        if (isVerificationLocked) {
            setError(applicationLocked ? 'Application is locked after prelims.' : 'Verification is locked for this candidate.')
            return
        }

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

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}`,
                {
                    method: 'PUT',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(formData)
                },
            )

            if (String(data.data).toLowerCase() === 'success') {
                setSubmitSuccess(true)
                redirectTimerRef.current = setTimeout(() => {
                    navigate(`/zp-staff/${applicationId}/applicants`)
                }, 3000)
            } else {
                throw new Error('Submission failed')
            }
        } catch {
            setError('Failed to submit verification. Please try again.')
            setSubmitting(false)
        }
    }

    const handleFlagClick = () => {
        if (applicationLocked || flagged || flagActionLoading) {
            return
        }

        setError('')
        setSuccessMessage('')
        setFlagModalAction('flag')
        setFlagComment('')
        setFlagModalError('')
        setShowFlagModal(true)
    }

    const handleUnflagClick = () => {
        if (applicationLocked || !flagged || flagActionLoading) {
            return
        }

        setError('')
        setSuccessMessage('')
        setFlagModalAction('unflag')
        setFlagComment('')
        setFlagModalError('')
        setShowFlagModal(true)
    }

    const handleConfirmFlagAction = async () => {
        if (!flagComment.trim()) {
            return
        }

        const action = flagModalAction
        const remark = encodeURIComponent(flagComment.trim())

        setFlagActionLoading(action)
        setError('')
        setSuccessMessage('')
        setFlagModalError('')

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}/${action}?remark=${remark}`,
                {
                    method: 'POST',
                    headers: createAuthHeaders(),
                },
            )

            if (data.result && data.data === 'success') {
                await fetchApplicantData({ showLoader: false })
                setShowFlagModal(false)
                setFlagComment('')
                setFlagModalError('')
                setSuccessMessage(`Candidate ${action === 'flag' ? 'flagged' : 'unflagged'} successfully.`)
            } else {
                throw new Error(`${action} failed`)
            }
        } catch {
            setFlagModalError(`Failed to ${action} this candidate. Please try again.`)
        } finally {
            setFlagActionLoading('')
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
        } else if (valueType === 'image') {
            return (
                <div className="resume-photo">
                    <img src={toAbsoluteFileUrl(value)} alt="profile photo" />
                </div>
            )
        } else if (valueType === 'doc') {
            return (
                <div className="document-actions">
                    <button
                        className="document-btn"
                        onClick={() => window.open(toAbsoluteFileUrl(value), '_blank')}
                    >
                        Open
                    </button>
                </div>
            )
        } else {
            return <div className="field-display">{value}</div>
        }
    }

    const getDocumentUrl = (url) => {
        return toAbsoluteFileUrl(url)
    }

    const getApplicantName = () => {
        const nameRow = formData.rows.find(row => (
            [1, 2, 3, 4].some(fieldNum => (
                String(row[`key${fieldNum}`] || '').toLowerCase().includes('name')
                    && row[`value${fieldNum}`]
            ))
        ))

        if (!nameRow) {
            return formData.userId || applicantId
        }

        const nameField = [1, 2, 3, 4].find(fieldNum => (
            String(nameRow[`key${fieldNum}`] || '').toLowerCase().includes('name')
                && nameRow[`value${fieldNum}`]
        ))

        return nameRow[`value${nameField}`] || formData.userId || applicantId
    }

    const is12thMarksRow = (row) => row.key1 === '12th Marks Earned'

    const getRowValueByKeyText = (row, keyText) => {
        const normalizedKeyText = keyText.toLowerCase()
        const fieldNum = [1, 2, 3, 4].find(index => (
            String(row[`key${index}`] || '').toLowerCase().includes(normalizedKeyText)
        ))

        return fieldNum ? row[`value${fieldNum}`] || '' : ''
    }

    const normalizeDecimalInput = (value) => (
        value === '' || /^\d{0,8}(\.\d{0,2})?$/.test(value)
            ? value
            : null
    )

    const openManual12thModal = (row) => {
        if (applicationLocked) {
            return
        }

        setManual12thError('')
        setManual12thForm({
            earned: getRowValueByKeyText(row, 'earned'),
            total: getRowValueByKeyText(row, 'total'),
        })
        setManual12thModalOpen(true)
    }

    const closeManual12thModal = () => {
        if (manual12thSubmitting) {
            return
        }

        setManual12thModalOpen(false)
        setManual12thForm({ earned: '', total: '' })
        setManual12thError('')
    }

    const handleManual12thChange = (field, value) => {
        const normalizedValue = normalizeDecimalInput(value)

        if (normalizedValue === null) {
            return
        }

        setManual12thError('')
        setManual12thForm(previousValue => ({
            ...previousValue,
            [field]: normalizedValue,
        }))
    }

    const isManual12thFormValid = () => {
        const earned = Number(manual12thForm.earned)
        const total = Number(manual12thForm.total)

        return manual12thForm.earned !== ''
            && manual12thForm.total !== ''
            && Number.isFinite(earned)
            && Number.isFinite(total)
            && earned >= 0
            && total > 0
            && total >= earned
    }

    const handleManual12thSubmit = async (event) => {
        event.preventDefault()

        if (applicationLocked) {
            setManual12thError('Application is locked after prelims.')
            return
        }

        if (!isManual12thFormValid()) {
            setManual12thError('Enter valid marks. Earned marks cannot exceed total marks.')
            return
        }

        setManual12thSubmitting(true)
        setManual12thError('')

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(applicantId)}/manual-12th`,
                {
                    method: 'POST',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        earned: Number(manual12thForm.earned),
                        total: Number(manual12thForm.total),
                    }),
                },
            )

            if (data.result && data.data === 'success') {
                setManual12thModalOpen(false)
                setManual12thSuccess(true)
                await fetchApplicantData({ showLoader: false })
                setTimeout(() => {
                    setManual12thSuccess(false)
                }, 1500)
            } else {
                throw new Error('Manual 12th update failed')
            }
        } catch {
            setManual12thError('Failed to update 12th marks. Please try again.')
        } finally {
            setManual12thSubmitting(false)
        }
    }

    const hasDocumentProof = (row) => (
        Boolean(row.documentProofUrl && row.documentProofUrl.trim() !== '')
            || Boolean(row.secondaryDocumentProofUrl && row.secondaryDocumentProofUrl.trim() !== '')
    )

    const rowsForDisplay = formData.rows
        .map((row, rowIndex) => ({ row, rowIndex }))

    const isVerificationLocked = applicationLocked || !allowEdit

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageLoader message="Loading applicant data..." />
                </div>
            </div>
        )
    }

    if (submitSuccess) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageSuccessState
                        title="Verification Successfully Submitted"
                        description="Redirecting to applicants list..."
                    />
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

                <InlineMessage>{error}</InlineMessage>
                <InlineMessage variant="success">{successMessage}</InlineMessage>

                {applicationLocked ? (
                    <div className="locked-note">
                        Application is locked after preliminary results. You can view details and documents, but actions are disabled.
                    </div>
                ) : isVerificationLocked && (
                    <div className="locked-note">
                        Verification status and reason are locked for this candidate.
                    </div>
                )}

                <div className="flag-remark-section">
                    <label className="field-label" htmlFor="flag-remark">
                        Flag Remark
                    </label>
                    <textarea
                        id="flag-remark"
                        className="flag-remark-textarea"
                        value={formData.flagRemark}
                        rows="3"
                        readOnly
                        placeholder="No flag remark"
                    />
                </div>

                {/* Rows */}
                <div className="rows-container">
                    {rowsForDisplay.map(({ row, rowIndex }) => (
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
                            {hasDocumentProof(row) && (
                                <div className="field-group">
                                    <label className="field-label">Document Proof:</label>
                                    <div className="document-actions">
                                        {row.documentProofUrl && row.documentProofUrl.trim() !== '' && (
                                            <button
                                                className="document-btn"
                                                onClick={() => window.open(getDocumentUrl(row.documentProofUrl), '_blank')}
                                            >
                                                📄 View Document
                                            </button>
                                        )}
                                        {!applicationLocked && is12thMarksRow(row) && (
                                            <button
                                                className="document-btn edit-12th-marks-btn"
                                                onClick={() => openManual12thModal(row)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {row.secondaryDocumentProofUrl && row.secondaryDocumentProofUrl.trim() !== '' && (
                                            <button
                                                className="document-btn secondary-document-btn"
                                                onClick={() => window.open(getDocumentUrl(row.secondaryDocumentProofUrl), '_blank')}
                                            >
                                                📄 View Self Declaration
                                            </button>
                                        )}
                                    </div>
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
                                                disabled={isVerificationLocked}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                className={`status-btn reject ${row.status === 'Reject' ? 'selected' : ''}`}
                                                onClick={() => handleRowStatusChange(rowIndex, 'Reject')}
                                                disabled={isVerificationLocked}
                                            >
                                                Reject
                                            </button>
                                            <button
                                                className={`status-btn not-verified ${row.status === 'Not Verified' ? 'selected' : ''}`}
                                                onClick={() => handleRowStatusChange(rowIndex, 'Not Verified')}
                                                disabled={isVerificationLocked}
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
                                                disabled={isVerificationLocked}
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
                            disabled={isVerificationLocked}
                        >
                            Reject Candidate
                        </button>
                        <button
                            className={`overall-btn pending ${formData.overallStatus === 'Pending' ? 'selected' : ''}`}
                            onClick={() => handleOverallStatusChange('Pending')}
                            disabled={isVerificationLocked}
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
                            disabled={isVerificationLocked}
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
                                    disabled={isVerificationLocked}
                                />
                                <span>Send email notification to applicant</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Action Section with Validation Errors */}
                <div className="action-section">
                    {!applicationLocked && Object.keys(validationErrors).length > 0 && (
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
                            disabled={submitting || flagActionLoading !== ''}
                        >
                            Go to Applicant List Page
                        </button>

                        {!applicationLocked && (auditor ? (
                            <>
                                <button
                                    className="flag-control-btn"
                                    onClick={handleFlagClick}
                                    disabled={applicationLocked || flagged || flagActionLoading !== ''}
                                >
                                    {flagActionLoading === 'flag' ? 'Flagging...' : 'Flag this candidate'}
                                </button>
                                <button
                                    className="unflag-control-btn"
                                    onClick={handleUnflagClick}
                                    disabled={applicationLocked || !flagged || flagActionLoading !== ''}
                                >
                                    {flagActionLoading === 'unflag' ? 'Unflagging...' : 'Unflag this candidate'}
                                </button>
                            </>
                        ) : (
                            <button
                                className="primary-btn"
                                onClick={handleSubmit}
                                disabled={submitting || isVerificationLocked}
                                title={isVerificationLocked ? 'Verification is locked for this candidate' : 'Submit verification'}
                            >
                                {submitting ? 'Submitting...' : 'Submit Verification'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Disclaimer Modal */}
                <ConfirmModal
                    isOpen={showDisclaimer}
                    title="Confirm Verification Submission"
                    description="Please recheck all the data before submitting the verification. This action will update the applicant's status and cannot be easily reversed."
                    details={(
                        <>
                            <p><strong>Overall Status:</strong> {formData.overallStatus}</p>
                            {formData.overallStatusComment && (
                                <p><strong>Comment:</strong> {formData.overallStatusComment}</p>
                            )}
                            {formData.sendEmail && (
                                <p><strong>Email:</strong> Will be sent to applicant</p>
                            )}
                        </>
                    )}
                    confirmLabel="Confirm & Submit"
                    onCancel={() => setShowDisclaimer(false)}
                    onConfirm={handleConfirmSubmit}
                />

                <ConfirmModal
                    isOpen={showFlagModal}
                    title={`${flagModalAction === 'flag' ? 'Flag' : 'Unflag'} this candidate`}
                    description={
                        flagModalAction === 'flag'
                            ? 'You are flagging this candidate and candidate will be marked as flagged'
                            : 'You are unflagging this candidate and candidate will no longer be marked as flagged'
                    }
                    details={(
                        <div className="flag-modal-content">
                            <InlineMessage className="flag-modal-error">{flagModalError}</InlineMessage>
                            <label className="field-label" htmlFor="flag-comment">
                                {flagModalAction === 'flag' ? 'why are you flagging :-' : 'why are you unflagging :-'}
                            </label>
                            <textarea
                                id="flag-comment"
                                value={flagComment}
                                onChange={(e) => setFlagComment(e.target.value)}
                                className="flag-comment-textarea"
                                rows="4"
                                placeholder={`Enter ${flagModalAction === 'flag' ? 'flagging' : 'unflagging'} comment`}
                                disabled={flagActionLoading !== ''}
                            />
                            <p className="flag-modal-help">Comment is required to enable {flagModalAction === 'flag' ? 'flagging' : 'unflagging'}.</p>
                        </div>
                    )}
                    cancelLabel="Back"
                    confirmLabel={
                        flagActionLoading === flagModalAction
                            ? `${flagModalAction === 'flag' ? 'Flagging' : 'Unflagging'}...`
                            : flagModalAction === 'flag' ? 'Flag' : 'Unflag'
                    }
                    confirmButtonClassName="flag-confirm-btn"
                    cancelDisabled={flagActionLoading !== ''}
                    confirmDisabled={!flagComment.trim() || flagActionLoading !== ''}
                    onCancel={() => {
                        setShowFlagModal(false)
                        setFlagComment('')
                        setFlagModalError('')
                    }}
                    onConfirm={handleConfirmFlagAction}
                />

                {manual12thSuccess && (
                    <div className="manual-12th-success-overlay">
                        <div className="manual-12th-success-card">
                            <div className="manual-12th-success-icon">✓</div>
                            <p>Edited successfully</p>
                        </div>
                    </div>
                )}

                {manual12thModalOpen && (
                    <div className="manual-12th-modal__overlay">
                        <div className="manual-12th-modal">
                            <h3>Editing 12th Marks for {getApplicantName()}</h3>
                            <InlineMessage>{manual12thError}</InlineMessage>
                            <form onSubmit={handleManual12thSubmit}>
                                <label className="manual-12th-field" htmlFor="manual-12th-earned">
                                    <span>Earned Marks in 12th</span>
                                    <input
                                        id="manual-12th-earned"
                                        type="text"
                                        inputMode="decimal"
                                        value={manual12thForm.earned}
                                        onChange={(event) => handleManual12thChange('earned', event.target.value)}
                                        placeholder="0.00"
                                        required
                                        disabled={manual12thSubmitting}
                                    />
                                </label>
                                <label className="manual-12th-field" htmlFor="manual-12th-total">
                                    <span>Total Marks in 12th</span>
                                    <input
                                        id="manual-12th-total"
                                        type="text"
                                        inputMode="decimal"
                                        value={manual12thForm.total}
                                        onChange={(event) => handleManual12thChange('total', event.target.value)}
                                        placeholder="0.00"
                                        required
                                        disabled={manual12thSubmitting}
                                    />
                                </label>
                                <div className="manual-12th-modal__actions">
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={closeManual12thModal}
                                        disabled={manual12thSubmitting}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="primary-btn"
                                        disabled={manual12thSubmitting || !isManual12thFormValid()}
                                    >
                                        {manual12thSubmitting ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ApplicantDetail
