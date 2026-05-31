import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import ConfirmModal from '../components/ui/ConfirmModal'
import { naturalSort } from '../lib/sort'
import EmptyState from '../components/ui/EmptyState'
import InlineMessage from '../components/ui/InlineMessage'
import PageLoader from '../components/ui/PageLoader'
import './Applicants.css'

const Applicants = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()

    // State
    const [applicants, setApplicants] = useState([])
    const [filteredApplicants, setFilteredApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [publishPrelim, setPublishPrelim] = useState(false)
    const [publishFinal, setPublishFinal] = useState(false)
    const [canStartAudit, setCanStartAudit] = useState(false)
    const [auditStarted, setAuditStarted] = useState(false)
    const [auditor, setAuditor] = useState(false)
    const [auditCompleted, setAuditCompleted] = useState(false)
    const [applicationClosed, setApplicationClosed] = useState(false)
    const [statusNotes, setStatusNotes] = useState([])
    const [showAuditDisclaimer, setShowAuditDisclaimer] = useState(false)
    const [startingAudit, setStartingAudit] = useState(false)
    const [completingAudit, setCompletingAudit] = useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Sorting
    const [sortColumn, setSortColumn] = useState('id')
    const [sortDirection, setSortDirection] = useState('asc')

    // Filters
    const [villageFilter, setVillageFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [flaggedFilter, setFlaggedFilter] = useState('')

    useEffect(() => {
        fetchApplicants()
    }, [applicationId])

    useEffect(() => {
        applyFiltersAndSort()
    }, [applicants, villageFilter, statusFilter, flaggedFilter, sortColumn, sortDirection])

    const applyApplicantsData = (data) => {
        setApplicants(data.applicants || [])
        setPublishPrelim(Boolean(data.publishPrelim))
        setPublishFinal(Boolean(data.publishFinal))
        setCanStartAudit(Boolean(data.canStartAudit))
        setAuditStarted(Boolean(data.auditStarted))
        setAuditor(Boolean(data.auditor))
        setAuditCompleted(Boolean(data.auditCompleted))
        setApplicationClosed(Boolean(data.closed))
        setStatusNotes(Array.isArray(data.status) ? data.status : [])
    }

    const fetchApplicants = async ({ showLoader = true } = {}) => {
        if (showLoader) {
            setLoading(true)
        }

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/applicants`, {
                method: 'GET',
                headers: createAuthHeaders(),
            })

            if (data.result && data.data) {
                setError('')
                applyApplicantsData(data.data)
            } else {
                throw new Error('Invalid response format')
            }
        } catch {
            setError('Failed to load applicants. Please try again.')
        } finally {
            if (showLoader) {
                setLoading(false)
            }
        }
    }

    const applyFiltersAndSort = () => {
        let result = [...applicants]

        // Apply filters
        if (villageFilter) {
            result = result.filter(app => app.village === villageFilter)
        }

        if (statusFilter) {
            result = result.filter(app => app.status.toLowerCase() === statusFilter.toLowerCase())
        }

        if (flaggedFilter) {
            const isFlagged = flaggedFilter === 'true'
            result = result.filter(app => Boolean(app.flagged) === isFlagged)
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal = a[sortColumn]
            let bVal = b[sortColumn]

            // Convert to numbers for numeric columns
            if (sortColumn === 'merit' || sortColumn === 'verifiedMerit') {
                aVal = parseFloat(aVal) || 0
                bVal = parseFloat(bVal) || 0
            } else if (sortColumn === 'flagged') {
                aVal = Boolean(aVal)
                bVal = Boolean(bVal)
            }

            // String comparison
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase()
                bVal = bVal.toLowerCase()
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        setFilteredApplicants(result)
        setCurrentPage(1) // Reset to first page when filters change
    }

    const handleSort = (column) => {
        if (column === 'view') return // Don't sort view column

        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const getSortIcon = (column) => {
        if (column === 'view') return ''
        if (sortColumn !== column) return '⇅'
        return sortDirection === 'asc' ? '↑' : '↓'
    }

    const handlePublishPrelim = () => {
        if (publishPrelim) {
            navigate(`/zp-staff/${applicationId}/publish-prelim`)
        }
    }

    const handlePublishFinal = () => {
        if (publishFinal) {
            navigate(`/zp-staff/${applicationId}/publish-final-result`)
        }
    }

    const handleStartAuditClick = () => {
        if (!canStartAudit || auditStarted || startingAudit) {
            return
        }

        setError('')
        setShowAuditDisclaimer(true)
    }

    const handleConfirmStartAudit = async () => {
        setShowAuditDisclaimer(false)
        setStartingAudit(true)
        setError('')

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/start-audit`, {
                method: 'POST',
                headers: createAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            })

            if (data.result && data.data === 'success') {
                setAuditStarted(true)
                setCanStartAudit(false)
                await fetchApplicants({ showLoader: false })
            } else {
                throw new Error('Unable to start audit')
            }
        } catch {
            setError('Not able to start the Audit')
        } finally {
            setStartingAudit(false)
        }
    }

    const handleCompleteAudit = async () => {
        if (!auditor || !auditStarted || auditCompleted || completingAudit) {
            return
        }

        setCompletingAudit(true)
        setError('')

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/complete-audit`, {
                method: 'POST',
                headers: createAuthHeaders({
                    'Content-Type': 'application/json',
                }),
            })

            if (data.result && data.data === 'success') {
                await fetchApplicants({ showLoader: false })
            } else {
                throw new Error('Unable to complete audit')
            }
        } catch {
            setError('Not able to complete the Audit')
        } finally {
            setCompletingAudit(false)
        }
    }

    const handleViewApplicant = (applicantId) => {
        navigate(`/zp-staff/${applicationId}/applicants/${applicantId}`)
    }

    // Pagination calculations
    const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentApplicants = filteredApplicants.slice(startIndex, endIndex)

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1)
        }
    }

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    const clearFilters = () => {
        setVillageFilter('')
        setStatusFilter('')
        setFlaggedFilter('')
    }

    const villageOptions = [...new Set(applicants.map(app => app.village).filter(Boolean))]
        .sort(naturalSort)

    const startAuditButtonClass = canStartAudit || startingAudit
        ? 'enabled'
        : 'disabled'
    const isStartAuditClickable = canStartAudit && !auditStarted && !startingAudit
    const startAuditButtonLabel = startingAudit
        ? 'Starting Audit...'
        : 'Start Audit'
    const startAuditButtonTitle = canStartAudit
            ? 'Start audit'
            : 'Audit cannot be started yet'
    const canCompleteAudit = auditor && auditStarted && !auditCompleted

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageLoader message="Loading applicants..." />
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="applicants-container">
                <div className="page-header">
                    <h1>Applicants</h1>
                    <p className="application-id">Application ID: <strong>{applicationId}</strong></p>
                </div>

                <InlineMessage>{error}</InlineMessage>

                {/* Filters */}
                <div className="filters-section">
                    <div className="filter-group">
                        <label htmlFor="villageFilter">Filter by Village:</label>
                        <select
                            id="villageFilter"
                            value={villageFilter}
                            onChange={(e) => setVillageFilter(e.target.value)}
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
                        <label htmlFor="statusFilter">Filter by Status:</label>
                        <select
                            id="statusFilter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label htmlFor="flaggedFilter">Filter by Flag:</label>
                        <select
                            id="flaggedFilter"
                            value={flaggedFilter}
                            onChange={(e) => setFlaggedFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All</option>
                            <option value="true">Flagged</option>
                            <option value="false">Not Flagged</option>
                        </select>
                    </div>

                    {(villageFilter || statusFilter || flaggedFilter) && (
                        <button onClick={clearFilters} className="clear-filters-btn">
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className="results-info">
                    {filteredApplicants.length === 0
                        ? 'Showing 0 of 0 applicants'
                        : `Showing ${startIndex + 1} - ${Math.min(endIndex, filteredApplicants.length)} of ${filteredApplicants.length} applicants`}
                </div>

                {/* Table */}
                {filteredApplicants.length === 0 ? (
                    <EmptyState
                        icon="👥"
                        title="No applicants found"
                        description="Try changing the selected filters or check back after more applications are submitted."
                    />
                ) : (
                    <>
                        <div className="table-container">
                            <table className="applicants-table">
                                <thead>
                                <tr>
                                    <th onClick={() => handleSort('sno')} className="sortable">
                                        S.NO {getSortIcon('sno')}
                                    </th>
                                    <th onClick={() => handleSort('id')} className="sortable">
                                        ID {getSortIcon('id')}
                                    </th>
                                    <th onClick={() => handleSort('name')} className="sortable">
                                        Name {getSortIcon('name')}
                                    </th>
                                    <th onClick={() => handleSort('village')} className="sortable">
                                        Village {getSortIcon('village')}
                                    </th>
                                    <th onClick={() => handleSort('merit')} className="sortable">
                                        System-Generate-Merit {getSortIcon('merit')}
                                    </th>
                                    <th onClick={() => handleSort('verifiedMerit')} className="sortable">
                                        Human-Reviewed-Merit {getSortIcon('verifiedMerit')}
                                    </th>
                                    <th onClick={() => handleSort('status')} className="sortable">
                                        Status {getSortIcon('status')}
                                    </th>
                                    <th onClick={() => handleSort('flagged')} className="sortable">
                                        Flag {getSortIcon('flagged')}
                                    </th>
                                    <th>View</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentApplicants.map((applicant, index) => (
                                    <tr key={applicant.id}>
                                        <td>{startIndex + index + 1}</td>
                                        <td className="id-cell">{applicant.id}</td>
                                        <td>{applicant.name}</td>
                                        <td>{applicant.village}</td>
                                        <td>{applicant.merit}</td>
                                        <td>{applicant.verifiedMerit}</td>
                                        <td>
                        <span className={`status-badge status-${applicant.status.toLowerCase()}`}>
                          {applicant.status}
                        </span>
                                        </td>
                                        <td>
                                            {applicant.flagged && (
                                                <span className="flagged-tag">Flagged</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="view-btn"
                                                onClick={() => handleViewApplicant(applicant.id)}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    Previous
                                </button>

                                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>

                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="pagination-btn"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Publish Preliminary Result Button */}
                <div className="action-section">
                    {!applicationClosed && (
                        <div className="action-buttons">
                            {!auditStarted && (
                                <button
                                    className={`start-audit-btn ${startAuditButtonClass}`}
                                    onClick={handleStartAuditClick}
                                    disabled={!isStartAuditClickable}
                                    title={startAuditButtonTitle}
                                >
                                    {startAuditButtonLabel}
                                </button>
                            )}
                            {canCompleteAudit && (
                                <button
                                    className="complete-audit-btn enabled"
                                    onClick={handleCompleteAudit}
                                    disabled={completingAudit}
                                    title="Complete audit"
                                >
                                    {completingAudit ? 'Completing Audit...' : 'Complete Audit'}
                                </button>
                            )}
                            {auditStarted && publishFinal ? (
                                <button
                                    className="publish-merit-btn enabled"
                                    onClick={handlePublishFinal}
                                    title="Publish final result"
                                >
                                    Publish Final Result
                                </button>
                            ) : auditStarted && (
                                <button
                                    className={`publish-merit-btn ${publishPrelim ? 'enabled' : 'disabled'}`}
                                    onClick={handlePublishPrelim}
                                    disabled={!publishPrelim}
                                    title={!publishPrelim ? 'Not yet eligible for publishing preliminary result' : 'Publish preliminary result'}
                                >
                                    Publish Preliminary Result
                                </button>
                            )}
                        </div>
                    )}
                    {!applicationClosed && !canStartAudit && !auditStarted && (
                        <p className="audit-hint">Audit cannot be started yet</p>
                    )}
                    {!applicationClosed && auditStarted && !publishPrelim && !publishFinal && (
                        <p className="publish-hint">Not yet eligible for publishing preliminary result</p>
                    )}
                    {(applicationClosed || statusNotes.length > 0) && (
                        <div className="status-notes">
                            <h3>Status</h3>
                            <div className="status-notes-list">
                                {applicationClosed && statusNotes.length === 0 ? (
                                    <div className="status-note-item">
                                        Application is closed and final result has been published.
                                    </div>
                                ) : (
                                    statusNotes.map((note, index) => (
                                        <div key={`${note}-${index}`} className="status-note-item">
                                            {note}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <ConfirmModal
                    isOpen={showAuditDisclaimer}
                    title="Start Audit"
                    description="Once Audit is started you cannot make changes to application list"
                    cancelLabel="Go Back"
                    confirmLabel="OK"
                    onCancel={() => setShowAuditDisclaimer(false)}
                    onConfirm={handleConfirmStartAudit}
                />
            </div>
        </div>
    )
}

export default Applicants
