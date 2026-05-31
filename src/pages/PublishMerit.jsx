import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import ConfirmModal from '../components/ui/ConfirmModal'
import EmptyState from '../components/ui/EmptyState'
import InlineMessage from '../components/ui/InlineMessage'
import PageLoader from '../components/ui/PageLoader'
import PageSuccessState from '../components/ui/PageSuccessState'
import { naturalSort } from '../lib/sort'
import './PublishMerit.css'

const PAGE_SIZE = 10
const UNKNOWN_VILLAGE = 'Unknown Village'

const isVerified = (candidate) => candidate.status?.toLowerCase() === 'verified'

const toNumber = (value, fallback = 0) => {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

const getVillageName = (candidate) => candidate.village || UNKNOWN_VILLAGE

const getGrandTotal = (candidate) => candidate.verifiedMerit ?? candidate.merit ?? '-'

const isPlainObject = (value) => Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)

const sortByRank = (candidates) => [...candidates].sort((candidateA, candidateB) => {
    const rankDiff = toNumber(candidateA.rank) - toNumber(candidateB.rank)

    if (rankDiff !== 0) {
        return rankDiff
    }

    return toNumber(candidateA._originalIndex) - toNumber(candidateB._originalIndex)
})

const getStatusMeta = (candidate, index, vacancyNumber, isVacancyValid) => {
    if (!isVerified(candidate)) {
        return { label: 'Ineligible', className: 'ineligible' }
    }

    if (isVacancyValid && index < vacancyNumber) {
        return { label: 'Selected', className: 'selected' }
    }

    return { label: 'Waiting List', className: 'waiting' }
}

const getCutoffTie = (section) => {
    if (!section.isVacancyValid || section.vacancyNumber >= section.applicants.length) {
        return null
    }

    const firstCandidate = section.applicants[section.vacancyNumber - 1]
    const secondCandidate = section.applicants[section.vacancyNumber]

    if (!firstCandidate || !secondCandidate) {
        return null
    }

    if (toNumber(firstCandidate.rank) !== toNumber(secondCandidate.rank)) {
        return null
    }

    return {
        village: section.village,
        first: firstCandidate,
        second: secondCandidate,
        firstPosition: section.vacancyNumber,
        secondPosition: section.vacancyNumber + 1,
        merit: getGrandTotal(firstCandidate),
    }
}

const PublishMerit = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [applicants, setApplicants] = useState([])
    const [vacancyCounts, setVacancyCounts] = useState({})
    const [villagePages, setVillagePages] = useState({})
    const [showPublishConfirm, setShowPublishConfirm] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishSuccess, setPublishSuccess] = useState(false)

    const [showFullList, setShowFullList] = useState(false)
    const [fullListLoading, setFullListLoading] = useState(false)
    const [fullListError, setFullListError] = useState('')
    const [fullListRows, setFullListRows] = useState([])
    const [fullListPage, setFullListPage] = useState(1)
    const [fullListVillage, setFullListVillage] = useState('')

    const [activeTie, setActiveTie] = useState(null)
    const [selectedTieWinner, setSelectedTieWinner] = useState('')

    const fetchApplicants = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/applicants`, {
                method: 'GET',
                headers: createAuthHeaders(),
            })

            if (data.result && data.data) {
                const applicantsData = (data.data.applicants || []).map((candidate, index) => ({
                    ...candidate,
                    _rowKey: `${getVillageName(candidate)}-${candidate.id}-${index}`,
                    _originalIndex: index,
                    rank: toNumber(candidate.rank, index + 1),
                }))

                setApplicants(applicantsData)
            } else {
                throw new Error('Invalid response format')
            }
        } catch {
            setError('Failed to load applicants. Please try again.')
        } finally {
            setLoading(false)
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
                const vacancyValue = vacancyCounts[village] || ''
                const vacancyNumber = vacancyValue === '' ? 0 : Number(vacancyValue)
                const isVacancyValid = Number.isInteger(vacancyNumber)
                    && vacancyNumber > 0
                    && vacancyNumber <= totalCandidates
                const currentPage = villagePages[village] || 1
                const totalPages = Math.max(1, Math.ceil(totalCandidates / PAGE_SIZE))
                const safeCurrentPage = Math.min(currentPage, totalPages)
                const startIndex = (safeCurrentPage - 1) * PAGE_SIZE
                const eligibleCount = sortedVillageApplicants.filter(isVerified).length

                const section = {
                    village,
                    applicants: sortedVillageApplicants,
                    vacancyValue,
                    vacancyNumber,
                    isVacancyValid,
                    totalCandidates,
                    eligibleCount,
                    ineligibleCount: totalCandidates - eligibleCount,
                    currentPage: safeCurrentPage,
                    totalPages,
                    startIndex,
                    currentApplicants: sortedVillageApplicants.slice(startIndex, startIndex + PAGE_SIZE),
                    selectedCandidates: isVacancyValid
                        ? sortedVillageApplicants.slice(0, vacancyNumber).filter(isVerified)
                        : [],
                }

                return {
                    ...section,
                    cutoffTie: getCutoffTie(section),
                }
            })
    }, [applicants, vacancyCounts, villagePages])

    const allSelectedCandidates = villageSections.flatMap(section => section.selectedCandidates)
    const unresolvedTie = villageSections.find(section => section.cutoffTie)?.cutoffTie || null
    const hasInvalidVacancy = villageSections.some(section => !section.isVacancyValid)
    const canPublish = villageSections.length > 0
        && !hasInvalidVacancy
        && !unresolvedTie
        && allSelectedCandidates.length > 0

    const fullListColumnGroups = useMemo(() => {
        const columnMap = new Map()

        fullListRows.forEach((row) => {
            Object.entries(row || {}).forEach(([column, value]) => {
                if (isPlainObject(value)) {
                    const childColumns = columnMap.get(column)?.children || []

                    Object.keys(value).forEach((childColumn) => {
                        if (!childColumns.includes(childColumn)) {
                            childColumns.push(childColumn)
                        }
                    })

                    columnMap.set(column, {
                        key: column,
                        label: column,
                        children: childColumns,
                    })
                } else if (!columnMap.has(column)) {
                    columnMap.set(column, {
                        key: column,
                        label: column,
                        children: null,
                    })
                }
            })
        })

        return Array.from(columnMap.values())
    }, [fullListRows])

    const fullListTotalPages = Math.max(1, Math.ceil(fullListRows.length / PAGE_SIZE))
    const fullListStartIndex = (fullListPage - 1) * PAGE_SIZE
    const fullListCurrentRows = fullListRows.slice(fullListStartIndex, fullListStartIndex + PAGE_SIZE)

    const handleVacancyChange = (village, totalCandidates, event) => {
        const nextValue = event.target.value.replace(/\D/g, '')

        setError('')

        if (nextValue === '') {
            setVacancyCounts((previousValue) => ({
                ...previousValue,
                [village]: '',
            }))
            return
        }

        const nextNumber = Number(nextValue)

        if (nextNumber <= totalCandidates) {
            setVacancyCounts((previousValue) => ({
                ...previousValue,
                [village]: String(nextNumber),
            }))
        }
    }

    const setVillagePage = (village, nextPage) => {
        setVillagePages((previousValue) => ({
            ...previousValue,
            [village]: nextPage,
        }))
    }

    const handleViewFullList = async (village) => {
        setFullListVillage(village)
        setShowFullList(true)
        setFullListPage(1)
        setFullListRows([])

        setFullListLoading(true)
        setFullListError('')

        try {
            const data = await fetchJson(`/zp-staff/${applicationId}/all-candidate-detail?village=${encodeURIComponent(village)}`, {
                method: 'GET',
                headers: createAuthHeaders(),
            })

            if (data.result && Array.isArray(data.data)) {
                setFullListRows(data.data)
            } else {
                throw new Error('Invalid response format')
            }
        } catch {
            setFullListError('Failed to load full merit list. Please try again.')
        } finally {
            setFullListLoading(false)
        }
    }

    const handleResolveTieClick = (tie) => {
        if (!tie) {
            setError('No tie detected at the vacancy cutoff.')
            return
        }

        setError('')
        setSuccessMessage('')
        setActiveTie(tie)
        setSelectedTieWinner(tie.first._rowKey)
    }

    const handleApplyTieResolution = () => {
        if (!activeTie || !selectedTieWinner) {
            return
        }

        const villageApplicants = sortByRank(applicants.filter(candidate => getVillageName(candidate) === activeTie.village))
        const firstIndex = villageApplicants.findIndex(candidate => candidate._rowKey === activeTie.first._rowKey)
        const secondIndex = villageApplicants.findIndex(candidate => candidate._rowKey === activeTie.second._rowKey)

        if (selectedTieWinner === activeTie.second._rowKey && firstIndex !== -1 && secondIndex !== -1) {
            const firstCandidate = villageApplicants[firstIndex]
            villageApplicants[firstIndex] = villageApplicants[secondIndex]
            villageApplicants[secondIndex] = firstCandidate
        }

        const rerankedById = new Map(
            villageApplicants.map((candidate, index) => [
                candidate._rowKey,
                {
                    ...candidate,
                    rank: index + 1,
                    _originalIndex: index,
                },
            ]),
        )

        setApplicants((previousApplicants) => previousApplicants.map((candidate) => (
            rerankedById.get(candidate._rowKey) || candidate
        )))
        setActiveTie(null)
        setSelectedTieWinner('')
        setSuccessMessage(`Tie resolved locally for ${activeTie.village}. Please review the updated rank before publishing.`)
    }

    const handlePublishClick = () => {
        if (hasInvalidVacancy) {
            setError('Enter a valid vacancy count for every village.')
            return
        }

        if (unresolvedTie) {
            setError(`Resolve the tie at the vacancy cutoff for ${unresolvedTie.village} before publishing.`)
            return
        }

        if (allSelectedCandidates.length === 0) {
            setError('No eligible candidates are selected for publishing.')
            return
        }

        setError('')
        setShowPublishConfirm(true)
    }

    const handleConfirmPublish = async () => {
        setShowPublishConfirm(false)
        setPublishing(true)
        setError('')

        const meritUsers = allSelectedCandidates.map((candidate) => ({
            userId: candidate.id,
            name: candidate.name,
        }))

        try {
            const data = await fetchJson(
                `/zp-staff/${applicationId}/publish-prelim-list`,
                {
                    method: 'POST',
                    headers: createAuthHeaders({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({
                        applicationId,
                        meritUsers,
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
            setError('Failed to publish preliminary result. Please try again.')
            setPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageLoader message="Loading preliminary merit list..." />
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="publish-merit-container">
                <div className="page-header">
                    <h1>Preliminary Merit List — Review & Publish</h1>
                    <p className="application-id">Application ID: <strong>{applicationId}</strong></p>
                </div>

                <InlineMessage>{error}</InlineMessage>
                <InlineMessage variant="success">{successMessage}</InlineMessage>

                {publishSuccess && (
                    <div className="publish-success-dialog__overlay">
                        <div className="publish-success-dialog">
                            <PageSuccessState
                                title="Preliminary Result Published"
                                description="Returning to applicants..."
                            />
                        </div>
                    </div>
                )}

                {villageSections.length === 0 ? (
                    <EmptyState
                        icon="👥"
                        title="No applicants found"
                        description="Applicants will appear here once they are available for preliminary result publishing."
                    />
                ) : (
                    <div className="village-sections">
                        {villageSections.map((section) => (
                            <section key={section.village} className="village-section">
                                <div className="village-section__header">
                                    <div>
                                        <h2>{section.village}</h2>
                                        <div className="candidate-summary">
                                            <span><strong>Total Candidates:</strong> {section.totalCandidates}</span>
                                            <span><strong>Eligible:</strong> {section.eligibleCount}</span>
                                            <span><strong>Ineligible:</strong> {section.ineligibleCount}</span>
                                        </div>
                                    </div>

                                    <div className="vacancy-field">
                                        <label htmlFor={`vacancy-${section.village}`}>Vacancy Count</label>
                                        <input
                                            id={`vacancy-${section.village}`}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            value={section.vacancyValue}
                                            onChange={(event) => handleVacancyChange(section.village, section.totalCandidates, event)}
                                            placeholder="Enter count"
                                        />
                                    </div>
                                </div>

                                {section.cutoffTie && (
                                    <div className="tie-warning">
                                        <strong>Warning:</strong> Tie detected at vacancy cutoff between Candidate #{section.cutoffTie.firstPosition} and Candidate #{section.cutoffTie.secondPosition} (Grand Total: {section.cutoffTie.merit}). Use Resolve Tie before publishing.
                                    </div>
                                )}

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
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {section.currentApplicants.map((candidate, index) => {
                                            const absoluteIndex = section.startIndex + index
                                            const statusMeta = getStatusMeta(candidate, absoluteIndex, section.vacancyNumber, section.isVacancyValid)
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

                                    <div className="village-actions">
                                        <button className="secondary-btn" onClick={() => handleViewFullList(section.village)}>
                                            View Full Merit List
                                        </button>
                                        <button
                                            className="secondary-btn"
                                            onClick={() => handleResolveTieClick(section.cutoffTie)}
                                            disabled={!section.cutoffTie}
                                        >
                                            Resolve Tie
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                <div className="publish-actions">
                    <button
                        className="secondary-btn"
                        onClick={() => navigate(`/zp-staff/${applicationId}/applicants`)}
                        disabled={publishing}
                    >
                        Back
                    </button>
                    <button
                        className="publish-btn"
                        onClick={handlePublishClick}
                        disabled={publishing || !canPublish}
                    >
                        {publishing ? 'Publishing...' : 'Confirm & Publish Preliminary Result'}
                    </button>
                </div>

                {showFullList && (
                    <div className="full-list-modal__overlay">
                        <div className="full-list-modal">
                            <h2>Full Merit List</h2>
                            <InlineMessage>{fullListError}</InlineMessage>

                            {fullListLoading ? (
                                <PageLoader message="Loading full merit list..." />
                            ) : fullListRows.length === 0 ? (
                                <EmptyState
                                    icon="📋"
                                    title="No merit list data found"
                                    description="Candidate details will appear here once available."
                                />
                            ) : (
                                <>
                                    <div className="full-list-table-wrap">
                                        <div className="full-list-center-title">
                                            Anganwadi Center :- {fullListVillage || '-'}
                                        </div>
                                        <table className="full-list-table">
                                            <thead>
                                            <tr>
                                                {fullListColumnGroups.map((column) => (
                                                    <th
                                                        key={column.key}
                                                        colSpan={column.children ? column.children.length : 1}
                                                        rowSpan={column.children ? 1 : 2}
                                                    >
                                                        {column.label}
                                                    </th>
                                                ))}
                                            </tr>
                                            <tr>
                                                {fullListColumnGroups.flatMap((column) => (
                                                    column.children
                                                        ? column.children.map((childColumn) => (
                                                            <th key={`${column.key}-${childColumn}`}>{childColumn}</th>
                                                        ))
                                                        : []
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {fullListCurrentRows.map((row, rowIndex) => (
                                                <tr key={`${fullListStartIndex}-${rowIndex}`}>
                                                    {fullListColumnGroups.flatMap((column) => {
                                                        if (column.children) {
                                                            return column.children.map((childColumn) => (
                                                                <td key={`${column.key}-${childColumn}`}>
                                                                    {row[column.key]?.[childColumn] ?? '-'}
                                                                </td>
                                                            ))
                                                        }

                                                        return (
                                                            <td key={column.key}>{row[column.key] ?? '-'}</td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="pagination">
                                        <button
                                            onClick={() => setFullListPage(fullListPage - 1)}
                                            disabled={fullListPage === 1}
                                            className="pagination-btn"
                                        >
                                            Previous
                                        </button>
                                        <span className="pagination-info">Page {fullListPage} of {fullListTotalPages}</span>
                                        <button
                                            onClick={() => setFullListPage(fullListPage + 1)}
                                            disabled={fullListPage === fullListTotalPages}
                                            className="pagination-btn"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="full-list-modal__actions">
                                <button className="secondary-btn" onClick={() => setShowFullList(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={Boolean(activeTie)}
                    title="Resolve Tie"
                    description={`Select one candidate to keep above${activeTie?.village ? ` for ${activeTie.village}` : ''}.`}
                    details={activeTie && (
                        <div className="tie-options">
                            {[activeTie.first, activeTie.second].map((candidate, index) => (
                                <label key={candidate._rowKey} className="tie-option">
                                    <input
                                        type="radio"
                                        name="tieWinner"
                                        value={candidate._rowKey}
                                        checked={selectedTieWinner === candidate._rowKey}
                                        onChange={(event) => setSelectedTieWinner(event.target.value)}
                                    />
                                    Candidate #{index === 0 ? activeTie.firstPosition : activeTie.secondPosition} — {candidate.name || candidate.id}
                                </label>
                            ))}
                        </div>
                    )}
                    cancelLabel="Cancel"
                    confirmLabel="Apply"
                    onCancel={() => setActiveTie(null)}
                    onConfirm={handleApplyTieResolution}
                    confirmDisabled={!selectedTieWinner}
                />

                <ConfirmModal
                    isOpen={showPublishConfirm}
                    title="Confirm Preliminary Result Publication"
                    description={`This will publish ${allSelectedCandidates.length} selected candidate(s) across ${villageSections.length} village(s).`}
                    confirmLabel="Yes, Publish Preliminary Result"
                    confirmButtonClassName="danger-btn"
                    cancelDisabled={publishing}
                    confirmDisabled={publishing}
                    onCancel={() => setShowPublishConfirm(false)}
                    onConfirm={handleConfirmPublish}
                />
            </div>
        </div>
    )
}

export default PublishMerit
