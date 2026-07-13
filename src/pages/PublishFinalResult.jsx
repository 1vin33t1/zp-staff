import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson, toAbsoluteFileUrl, uploadPublicFile } from '../lib/api'
import ConfirmModal from '../components/ui/ConfirmModal'
import EmptyState from '../components/ui/EmptyState'
import InlineMessage from '../components/ui/InlineMessage'
import PageLoader from '../components/ui/PageLoader'
import PageSuccessState from '../components/ui/PageSuccessState'
import { naturalSort } from '../lib/sort'
import './PublishMerit.css'

const PAGE_SIZE = 10
const UNKNOWN_VILLAGE = 'Unknown Village'
const BOOLEAN_FIELD_NAMES = [
    'widow_orphan',
    'govtHelper',
    'classXII',
    'graduate',
    'postGraduate',
    'd_ed',
    'b_ed',
    'mscit',
]
const CASTE_OPTIONS = [
    ['general', 'Open (General)'],
    ['obc', 'OBC'],
    ['st', 'ST (Scheduled Tribe)'],
    ['sc', 'SC (Scheduled Caste)'],
    ['vj', 'Vimukta Jati – VJ'],
    ['ntb', 'Nomadic Tribe -B'],
    ['ntc', 'Nomadic Tribe -C'],
    ['ntd', 'Nomadic Tribe -D'],
    ['sbc', 'Special Backward Class – SBC'],
    ['sebc', 'Socially and Educationally Backward Class - SEBC'],
    ['ews', 'EWS (Economically Weaker Section)'],
]

const booleanToRadioValue = (value) => (
    typeof value === 'boolean' ? String(value) : ''
)

const createManualEntryForm = (candidate = {}, manualEntry = null) => {
    const personalDetail = manualEntry?.personalDetail || {}
    const educationQualification = manualEntry?.educationQualification || {}
    const caste = personalDetail.caste || candidate.caste || ''

    return {
        caste: CASTE_OPTIONS.some(([value]) => value === caste) ? caste : '',
        widow_orphan: booleanToRadioValue(personalDetail.widow_orphan),
        govtHelper: booleanToRadioValue(personalDetail.govtHelper),
        classXII: booleanToRadioValue(educationQualification.classXII),
        classXIIPercentage: educationQualification.classXIIPercentage ?? '',
        graduate: booleanToRadioValue(educationQualification.graduate),
        postGraduate: booleanToRadioValue(educationQualification.postGraduate),
        d_ed: booleanToRadioValue(educationQualification.d_ed),
        b_ed: booleanToRadioValue(educationQualification.b_ed),
        mscit: booleanToRadioValue(educationQualification.mscit),
        remark: manualEntry?.remark || '',
    }
}

const isVerified = (candidate) => candidate.status?.toLowerCase() === 'verified'

const toNumber = (value, fallback = 0) => {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const getVillageName = (candidate) => candidate.village || UNKNOWN_VILLAGE

const getGrandTotal = (candidate) => candidate.verifiedMerit ?? candidate.merit ?? '-'

const sortByRank = (candidates) => [...candidates].sort((candidateA, candidateB) => {
    const rankDiff = toNumber(candidateA.rank) - toNumber(candidateB.rank)

    if (rankDiff !== 0) {
        return rankDiff
    }

    return toNumber(candidateA._originalIndex) - toNumber(candidateB._originalIndex)
})

const getStatusMeta = (candidate, index, vacancyNumber) => {
    if (!isVerified(candidate)) {
        return { label: 'Ineligible', className: 'ineligible' }
    }

    if (index < vacancyNumber) {
        return { label: 'Selected', className: 'selected' }
    }

    return { label: 'Waiting List', className: 'waiting' }
}

const RadioField = ({ label, name, value, onChange, disabled }) => (
    <fieldset className="manual-entry-radio-field">
        <legend>{label}</legend>
        <label>
            <input
                type="radio"
                name={name}
                value="true"
                checked={value === 'true'}
                onChange={(event) => onChange(name, event.target.value)}
                required
                disabled={disabled}
            />
            Yes
        </label>
        <label>
            <input
                type="radio"
                name={name}
                value="false"
                checked={value === 'false'}
                onChange={(event) => onChange(name, event.target.value)}
                required
                disabled={disabled}
            />
            No
        </label>
    </fieldset>
)

const PublishFinalResult = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [applicants, setApplicants] = useState([])
    const [vacancyCounts, setVacancyCounts] = useState({})
    const [villagePages, setVillagePages] = useState({})
    const [takrarComplete, setTakrarComplete] = useState(false)
    const [actionCandidate, setActionCandidate] = useState(null)
    const [actionComment, setActionComment] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [actionToast, setActionToast] = useState('')
    const [draftGenerating, setDraftGenerating] = useState(false)
    const [draftFinalListGenerated, setDraftFinalListGenerated] = useState(false)
    const [uploadingSignedCopy, setUploadingSignedCopy] = useState(false)
    const [signedCopyAsset, setSignedCopyAsset] = useState('')
    const [signedCopyFileName, setSignedCopyFileName] = useState('')
    const [publishing, setPublishing] = useState(false)
    const [publishSuccess, setPublishSuccess] = useState(false)
    const [showPublishConfirm, setShowPublishConfirm] = useState(false)
    const [manualEntryCandidate, setManualEntryCandidate] = useState(null)
    const [manualEntryForm, setManualEntryForm] = useState(createManualEntryForm())
    const [manualEntryError, setManualEntryError] = useState('')
    const [manualEntryLoading, setManualEntryLoading] = useState(false)
    const [manualEntrySubmitting, setManualEntrySubmitting] = useState(false)

    const fetchApplicants = useCallback(async ({ showLoader = true } = {}) => {
        if (showLoader) {
            setLoading(true)
        }
        setError('')

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/applicants`, {
                method: 'GET',
                headers: createAuthHeaders(),
            })

            if (data.result && data.data) {
                const applicantsList = Array.isArray(data.data.applicants) ? data.data.applicants : []
                const applicantsData = applicantsList.map((candidate, index) => ({
                    ...candidate,
                    _rowKey: `${getVillageName(candidate)}-${candidate.id}-${index}`,
                    _originalIndex: index,
                    rank: toNumber(candidate.rank, index + 1),
                }))

                setApplicants(applicantsData)
                setVacancyCounts(data.data.vacancyCount && typeof data.data.vacancyCount === 'object'
                    ? data.data.vacancyCount
                    : {})
                setDraftFinalListGenerated(false)
            } else {
                throw new Error('Invalid response format')
            }
        } catch {
            setError('Failed to load final result data. Please try again.')
        } finally {
            if (showLoader) {
                setLoading(false)
            }
        }
    }, [applicationId])

    useEffect(() => {
        fetchApplicants()
    }, [fetchApplicants])

    const villageSections = useMemo(() => {
        const groupedApplicants = applicants.reduce((groups, candidate) => {
            const village = getVillageName(candidate)

            if (!groups[village]) {
                groups[village] = []
            }

            groups[village].push(candidate)
            return groups
        }, {})

        return Object.keys(groupedApplicants)
            .sort(naturalSort)
            .map((village) => {
                const sortedVillageApplicants = sortByRank(groupedApplicants[village])
                const totalCandidates = sortedVillageApplicants.length
                const vacancyNumber = Math.min(toNumber(vacancyCounts[village], 0), totalCandidates)
                const currentPage = villagePages[village] || 1
                const totalPages = Math.max(1, Math.ceil(totalCandidates / PAGE_SIZE))
                const safeCurrentPage = Math.min(currentPage, totalPages)
                const startIndex = (safeCurrentPage - 1) * PAGE_SIZE
                const eligibleCount = sortedVillageApplicants.filter(isVerified).length

                return {
                    village,
                    applicants: sortedVillageApplicants,
                    vacancyNumber,
                    totalCandidates,
                    eligibleCount,
                    ineligibleCount: totalCandidates - eligibleCount,
                    currentPage: safeCurrentPage,
                    totalPages,
                    startIndex,
                    currentApplicants: sortedVillageApplicants.slice(startIndex, startIndex + PAGE_SIZE),
                    selectedCandidates: sortedVillageApplicants.slice(0, vacancyNumber).filter(isVerified),
                }
            })
    }, [applicants, vacancyCounts, villagePages])

    const selectedCandidates = villageSections.flatMap(section => section.selectedCandidates)
    const manualEntryBusy = manualEntryLoading || manualEntrySubmitting

    const setVillagePage = (village, nextPage) => {
        setVillagePages((previousValue) => ({
            ...previousValue,
            [village]: nextPage,
        }))
    }

    const getCandidateAction = (statusMeta) => (
        statusMeta.label === 'Ineligible' ? 'reinstate' : 'disqualify'
    )

    const openCandidateAction = (candidate, statusMeta) => {
        setError('')
        setSuccessMessage('')
        setActionCandidate({
            ...candidate,
            _action: getCandidateAction(statusMeta),
        })
        setActionComment('')
    }

    const handleCandidateAction = async () => {
        if (!actionCandidate || !actionComment.trim()) {
            return
        }

        const action = actionCandidate._action
        const remark = encodeURIComponent(actionComment.trim())

        setActionLoading(true)
        setError('')

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(actionCandidate.id)}/${action}?remark=${remark}`,
                {
                    method: 'POST',
                    headers: createAuthHeaders(),
                },
            )

            if (data.result && String(data.data).toLowerCase() === 'success') {
                setActionCandidate(null)
                setActionComment('')
                setActionToast(`Candidate ${action === 'disqualify' ? 'disqualified' : 'reinstated'} successfully.`)
                setTimeout(async () => {
                    setActionToast('')
                    await fetchApplicants({ showLoader: false })
                }, 1000)
            } else {
                throw new Error(`${action} failed`)
            }
        } catch {
            setError(`Failed to ${action} candidate. Please try again.`)
        } finally {
            setActionLoading(false)
        }
    }

    const buildMeritUsers = () => selectedCandidates.map((candidate) => ({
        userId: candidate.id,
        name: candidate.name,
    }))

    const handleGenerateDraftFinalList = async () => {
        if (selectedCandidates.length === 0) {
            setError('No selected candidates available for the final list.')
            return
        }

        setDraftGenerating(true)
        setError('')

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/draft-final-list`,
                {
                    method: 'POST',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        applicationId,
                        meritUsers: buildMeritUsers(),
                    }),
                },
            )

            if (data.result && String(data.data).toLowerCase() === 'success') {
                setSuccessMessage('Draft final list generated successfully.')
                setDraftFinalListGenerated(true)
            } else {
                throw new Error('Draft generation failed')
            }
        } catch {
            setError('Failed to generate draft final list. Please try again.')
        } finally {
            setDraftGenerating(false)
        }
    }

    const openManualEntry = async (candidate) => {
        setError('')
        setSuccessMessage('')
        setManualEntryError('')
        setManualEntryCandidate(candidate)
        setManualEntryForm(createManualEntryForm(candidate))
        setManualEntryLoading(true)

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(candidate.id)}/manual-data`,
                {
                    method: 'GET',
                    headers: createAuthHeaders(),
                },
            )

            if (data.data) {
                setManualEntryForm(createManualEntryForm(candidate, data.data))
            } else {
                throw new Error('Manual entry missing')
            }
        } catch {
            setManualEntryError('Failed to load existing manual data. Please enter the details manually.')
        } finally {
            setManualEntryLoading(false)
        }
    }

    const closeManualEntry = () => {
        if (manualEntrySubmitting || manualEntryLoading) {
            return
        }

        setManualEntryCandidate(null)
        setManualEntryForm(createManualEntryForm())
        setManualEntryError('')
        setManualEntryLoading(false)
    }

    const handleManualEntryFieldChange = (fieldName, value) => {
        setManualEntryError('')
        setManualEntryForm((previousValue) => ({
            ...previousValue,
            [fieldName]: value,
        }))
    }

    const handlePercentageChange = (value) => {
        if (value === '' || /^\d{0,3}(\.\d{0,2})?$/.test(value)) {
            handleManualEntryFieldChange('classXIIPercentage', value)
        }
    }

    const isManualEntryFormValid = () => {
        const percentage = Number(manualEntryForm.classXIIPercentage)

        return Boolean(manualEntryForm.caste)
            && BOOLEAN_FIELD_NAMES.every((fieldName) => manualEntryForm[fieldName] !== '')
            && manualEntryForm.classXIIPercentage !== ''
            && Number.isFinite(percentage)
            && percentage >= 0
            && percentage <= 100
            && manualEntryForm.remark.trim().length > 0
    }

    const toBoolean = (value) => value === 'true'

    const handleManualEntrySubmit = async (event) => {
        event.preventDefault()

        if (!manualEntryCandidate || !isManualEntryFormValid()) {
            setManualEntryError('Please fill every required field before submitting.')
            return
        }

        setManualEntrySubmitting(true)
        setManualEntryError('')
        setError('')

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/applicants/${encodeURIComponent(manualEntryCandidate.id)}/manual-data`,
                {
                    method: 'POST',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        personalDetail: {
                            caste: manualEntryForm.caste,
                            widow_orphan: toBoolean(manualEntryForm.widow_orphan),
                            govtHelper: toBoolean(manualEntryForm.govtHelper),
                        },
                        educationQualification: {
                            classXII: toBoolean(manualEntryForm.classXII),
                            classXIIPercentage: Number(manualEntryForm.classXIIPercentage),
                            graduate: toBoolean(manualEntryForm.graduate),
                            postGraduate: toBoolean(manualEntryForm.postGraduate),
                            d_ed: toBoolean(manualEntryForm.d_ed),
                            b_ed: toBoolean(manualEntryForm.b_ed),
                            mscit: toBoolean(manualEntryForm.mscit),
                        },
                        remark: manualEntryForm.remark.trim(),
                    }),
                },
            )

            if (data.result && String(data.data).toLowerCase() === 'success') {
                setManualEntryCandidate(null)
                setManualEntryForm(createManualEntryForm())
                setSuccessMessage('Manual data updated successfully.')
                await fetchApplicants({ showLoader: false })
            } else {
                throw new Error('Manual entry failed')
            }
        } catch {
            setManualEntryError('Failed to update manual data. Please try again.')
        } finally {
            setManualEntrySubmitting(false)
        }
    }

    const handleViewGeneratedPdf = async () => {
        setError('')

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/draft-final-list`, {
                method: 'GET',
                headers: createAuthHeaders(),
            })

            if (data.result && data.data) {
                window.open(toAbsoluteFileUrl(data.data), '_blank', 'noopener,noreferrer')
            } else {
                throw new Error('Draft PDF missing')
            }
        } catch {
            setError('Failed to open generated PDF. Please try again.')
        }
    }

    const handleSignedCopyUpload = async (file) => {
        if (!file) {
            return
        }

        setUploadingSignedCopy(true)
        setError('')

        try {
            const data = await uploadPublicFile(file)

            if (data.result && data.data) {
                setSignedCopyAsset(data.data)
                setSignedCopyFileName(file.name)
                setSuccessMessage('Signed copy uploaded successfully.')
            } else {
                throw new Error('Upload failed')
            }
        } catch {
            setError('Failed to upload signed copy. Please try again.')
        } finally {
            setUploadingSignedCopy(false)
        }
    }

    const handlePublishFinal = () => {
        if (!signedCopyAsset) {
            setError('Upload signed copy before publishing final result.')
            return
        }

        if (selectedCandidates.length === 0) {
            setError('No selected candidates available for publishing.')
            return
        }

        setError('')
        setShowPublishConfirm(true)
    }

    const handleConfirmPublishFinal = async () => {
        setShowPublishConfirm(false)
        setPublishing(true)
        setError('')

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/publish-final-list`,
                {
                    method: 'POST',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        applicationId,
                        meritUsers: buildMeritUsers(),
                        signedCopyAsset,
                    }),
                },
            )

            if (data.result && String(data.data).toLowerCase() === 'success') {
                setPublishSuccess(true)
                setTimeout(() => {
                    navigate(`/zp-staff/${applicationId}/applicants`)
                }, 2000)
            } else {
                throw new Error('Publish failed')
            }
        } catch {
            setError('Failed to publish final result. Please try again.')
        } finally {
            setPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageLoader message="Loading final result..." />
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="publish-merit-container">
                <div className={takrarComplete ? '' : 'final-result-blurred'}>
                    <div className="page-header">
                        <h1>Final Merit List — Review & Publish</h1>
                        <p className="application-id">Application ID: <strong>{applicationId}</strong></p>
                    </div>

                    <InlineMessage>{error}</InlineMessage>
                    <InlineMessage variant="success">{successMessage}</InlineMessage>

                    {actionToast && (
                        <div className="publish-success-dialog__overlay">
                            <div className="publish-success-dialog">
                                <PageSuccessState title={actionToast} />
                            </div>
                        </div>
                    )}

                    {publishSuccess && (
                        <div className="publish-success-dialog__overlay">
                            <div className="publish-success-dialog">
                                <PageSuccessState
                                    title="Final Result Published"
                                    description="Returning to applicants..."
                                />
                            </div>
                        </div>
                    )}

                    {villageSections.length === 0 ? (
                        <EmptyState
                            icon="👥"
                            title="No applicants found"
                            description="Applicants will appear here once they are available for final result publishing."
                        />
                    ) : (
                        <div className="village-sections">
                            {villageSections.map((section) => (
                                <section key={section.village} className="village-section">
                                    <div className="village-section__header">
                                        <div>
                                            <h2>{section.village}</h2>
                                            <div className="candidate-summary">
                                                <span><strong>Vacancy Count:</strong> {section.vacancyNumber}</span>
                                                <span><strong>Total Candidates:</strong> {section.totalCandidates}</span>
                                                <span><strong>Eligible:</strong> {section.eligibleCount}</span>
                                                <span><strong>Ineligible:</strong> {section.ineligibleCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="table-container">
                                        <table className="candidates-table">
                                            <thead>
                                            <tr>
                                                <th>S.No.</th>
                                                <th>Name</th>
                                                <th>Age</th>
                                                <th>Caste</th>
                                                <th>Grand Total</th>
                                                <th>Status</th>
                                                <th>Rank</th>
                                                <th>Remarks</th>
                                                <th>Committee Flags</th>
                                                <th>Action</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {section.currentApplicants.map((candidate, index) => {
                                                const absoluteIndex = section.startIndex + index
                                                const statusMeta = getStatusMeta(candidate, absoluteIndex, section.vacancyNumber)
                                                const action = getCandidateAction(statusMeta)
                                                const remark = isVerified(candidate) && !candidate.flagged
                                                    ? '-'
                                                    : candidate.remark || '-'

                                                return (
                                                    <tr key={candidate._rowKey} className={`candidate-row candidate-row--${statusMeta.className}`}>
                                                        <td>{absoluteIndex + 1}</td>
                                                        <td>{candidate.name || '-'}</td>
                                                        <td>{candidate.age || '-'}</td>
                                                        <td>{candidate.caste || '-'}</td>
                                                        <td>{getGrandTotal(candidate)}</td>
                                                        <td>
                                                            <span className={`candidate-status candidate-status--${statusMeta.className}`}>
                                                                {statusMeta.label}
                                                            </span>
                                                        </td>
                                                        <td>{candidate.rank || '-'}</td>
                                                        <td>{remark}</td>
                                                        <td>
                                                            {candidate.flagged ? (
                                                                <span className="flagged-tag">Flagged</span>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="candidate-action-buttons">
                                                                <button
                                                                    className="manual-entry-inline-btn"
                                                                    onClick={() => openManualEntry(candidate)}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    className={action === 'disqualify' ? 'danger-inline-btn' : 'success-inline-btn'}
                                                                    onClick={() => openCandidateAction(candidate, statusMeta)}
                                                                >
                                                                    {action === 'disqualify' ? 'Disqualify' : 'Reinstate'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="village-section__footer">
                                        <div className="pagination">
                                            <button
                                                onClick={() => setVillagePage(section.village, section.currentPage - 1)}
                                                disabled={section.currentPage === 1}
                                                className="pagination-btn"
                                            >
                                                Previous
                                            </button>
                                            <span className="pagination-info">Page {section.currentPage} of {section.totalPages}</span>
                                            <button
                                                onClick={() => setVillagePage(section.village, section.currentPage + 1)}
                                                disabled={section.currentPage === section.totalPages}
                                                className="pagination-btn"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    <div className="publish-actions final-publish-actions">
                        <button
                            className="secondary-btn"
                            onClick={() => navigate(`/zp-staff/${applicationId}/applicants`)}
                            disabled={publishing}
                        >
                            Back
                        </button>
                        <button
                            className="publish-btn"
                            onClick={handleGenerateDraftFinalList}
                            disabled={draftGenerating || selectedCandidates.length === 0}
                        >
                            {draftGenerating ? 'Generating...' : 'Confirm Final List & Generate PDF'}
                        </button>
                        <button
                            className="secondary-btn"
                            onClick={handleViewGeneratedPdf}
                            disabled={!draftFinalListGenerated || draftGenerating}
                            title={!draftFinalListGenerated ? 'Generate the final list PDF first' : 'View generated PDF'}
                        >
                            View Generated PDF
                        </button>
                        <label className={`secondary-btn upload-signed-copy-btn ${uploadingSignedCopy ? 'disabled' : ''}`}>
                            {uploadingSignedCopy ? 'Uploading...' : signedCopyAsset ? 'Change Signed Copy' : 'Upload Signed Copy'}
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(event) => {
                                    const file = event.target.files[0]
                                    // Clear so re-selecting the same file fires onChange again.
                                    event.target.value = ''
                                    handleSignedCopyUpload(file)
                                }}
                                disabled={uploadingSignedCopy}
                            />
                        </label>
                        <button
                            className="publish-btn"
                            onClick={handlePublishFinal}
                            disabled={publishing || !signedCopyAsset}
                        >
                            {publishing ? 'Publishing...' : 'Publish Final Result'}
                        </button>
                    </div>
                    {signedCopyFileName && (
                        <p className="signed-copy-note">Uploaded signed copy: {signedCopyFileName}</p>
                    )}
                </div>

                {!takrarComplete && (
                    <div className="takrar-lock-overlay">
                        <div className="takrar-lock-card">
                            <div className="takrar-lock-icon">🔒</div>
                            <h2>Actions Locked</h2>
                            <p>Please wait for instructions from higher authorities.</p>
                            <p>All actions are locked until Takrar process is marked complete.</p>
                            <h3>Takrar Process Complete?</h3>
                            <div className="takrar-lock-actions">
                                <button className="publish-btn" onClick={() => setTakrarComplete(true)}>
                                    YES
                                </button>
                                <button
                                    className="secondary-btn"
                                    type="button"
                                    onClick={() => navigate(`/zp-staff/${applicationId}/applicants`)}
                                >
                                    NO
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={Boolean(actionCandidate)}
                    title={actionCandidate?._action === 'disqualify' ? 'Disqualify Candidate' : 'Reinstate Candidate'}
                    description="Please verify the candidate details and provide a comment."
                    details={actionCandidate && (
                        <div className="final-action-modal">
                            <p><strong>Name:</strong> {actionCandidate.name || '-'}</p>
                            <p><strong>Age:</strong> {actionCandidate.age || '-'}</p>
                            <p><strong>Village:</strong> {getVillageName(actionCandidate)}</p>
                            <p><strong>Grand Total:</strong> {getGrandTotal(actionCandidate)}</p>
                            <label htmlFor="final-action-comment">
                                {actionCandidate._action === 'disqualify'
                                    ? 'Why are you disqualifying?'
                                    : 'Why are you reinstating?'}
                            </label>
                            <textarea
                                id="final-action-comment"
                                value={actionComment}
                                onChange={(event) => setActionComment(event.target.value)}
                                rows="4"
                                disabled={actionLoading}
                                placeholder="Enter comment"
                            />
                        </div>
                    )}
                    cancelLabel="Back"
                    confirmLabel={actionCandidate?._action === 'disqualify' ? 'Disqualify' : 'Reinstate'}
                    confirmButtonClassName={actionCandidate?._action === 'disqualify' ? 'danger-btn' : 'publish-btn'}
                    cancelDisabled={actionLoading}
                    confirmDisabled={!actionComment.trim() || actionLoading}
                    onCancel={() => {
                        setActionCandidate(null)
                        setActionComment('')
                    }}
                    onConfirm={handleCandidateAction}
                />

                {manualEntryCandidate && (
                    <div className="manual-entry-modal__overlay">
                        <div className="manual-entry-modal">
                            <div className="manual-entry-modal__header">
                                <div>
                                    <h2>Manual Data Entry</h2>
                                    <p>{manualEntryCandidate.name || manualEntryCandidate.id || 'Applicant'}</p>
                                </div>
                            </div>

                            <InlineMessage>{manualEntryError}</InlineMessage>
                            {manualEntryLoading && (
                                <p className="manual-entry-loading">Loading existing manual data...</p>
                            )}

                            <form className="manual-entry-form" onSubmit={handleManualEntrySubmit}>
                                <section className="manual-entry-section">
                                    <h3>Personal Detail</h3>
                                    <div className="manual-entry-grid">
                                        <label className="manual-entry-field" htmlFor="manual-caste">
                                            <span>Caste</span>
                                            <select
                                                id="manual-caste"
                                                value={manualEntryForm.caste}
                                                onChange={(event) => handleManualEntryFieldChange('caste', event.target.value)}
                                                required
                                                disabled={manualEntryBusy}
                                            >
                                                <option value="">Select caste</option>
                                                {CASTE_OPTIONS.map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </label>

                                        <RadioField
                                            label="Widow/Orphan"
                                            name="widow_orphan"
                                            value={manualEntryForm.widow_orphan}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                        <RadioField
                                            label="Govt. Helper"
                                            name="govtHelper"
                                            value={manualEntryForm.govtHelper}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                    </div>
                                </section>

                                <section className="manual-entry-section">
                                    <h3>Education Qualification</h3>
                                    <div className="manual-entry-grid manual-entry-grid--education">
                                        <RadioField
                                            label="class XII"
                                            name="classXII"
                                            value={manualEntryForm.classXII}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                        <label className="manual-entry-field" htmlFor="manual-class-xii-percentage">
                                            <span>class XII Percentage</span>
                                            <input
                                                id="manual-class-xii-percentage"
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={manualEntryForm.classXIIPercentage}
                                                onChange={(event) => handlePercentageChange(event.target.value)}
                                                required
                                                disabled={manualEntryBusy}
                                                placeholder="0.00"
                                            />
                                        </label>
                                        <RadioField
                                            label="Graduate"
                                            name="graduate"
                                            value={manualEntryForm.graduate}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                        <RadioField
                                            label="Post-Graduate"
                                            name="postGraduate"
                                            value={manualEntryForm.postGraduate}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                        <RadioField
                                            label="B.Ed"
                                            name="b_ed"
                                            value={manualEntryForm.b_ed}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                        <RadioField
                                            label="D.Ed"
                                            name="d_ed"
                                            value={manualEntryForm.d_ed}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                        <RadioField
                                            label="MSCIT"
                                            name="mscit"
                                            value={manualEntryForm.mscit}
                                            onChange={handleManualEntryFieldChange}
                                            disabled={manualEntryBusy}
                                        />
                                    </div>
                                </section>

                                <label className="manual-entry-field manual-entry-field--remark" htmlFor="manual-remark">
                                    <span>Remark</span>
                                    <textarea
                                        id="manual-remark"
                                        value={manualEntryForm.remark}
                                        onChange={(event) => handleManualEntryFieldChange('remark', event.target.value)}
                                        required
                                        disabled={manualEntryBusy}
                                        rows="3"
                                        placeholder="Enter remark"
                                    />
                                </label>

                                <div className="manual-entry-modal__actions">
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={closeManualEntry}
                                        disabled={manualEntryBusy}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="publish-btn"
                                        disabled={manualEntryBusy || !isManualEntryFormValid()}
                                    >
                                        {manualEntrySubmitting ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={showPublishConfirm}
                    title="Publish Final Result"
                    description={`This will publish ${selectedCandidates.length} selected candidate(s) with the uploaded signed copy.`}
                    confirmLabel="Yes, Publish Final Result"
                    confirmButtonClassName="danger-btn"
                    cancelDisabled={publishing}
                    confirmDisabled={publishing}
                    onCancel={() => setShowPublishConfirm(false)}
                    onConfirm={handleConfirmPublishFinal}
                />
            </div>
        </div>
    )
}

export default PublishFinalResult
