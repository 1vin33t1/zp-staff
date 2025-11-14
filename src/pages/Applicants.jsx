import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './Applicants.css'

const Applicants = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()

    // State
    const [applicants, setApplicants] = useState([])
    const [filteredApplicants, setFilteredApplicants] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [publishMerit, setPublishMerit] = useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Sorting
    const [sortColumn, setSortColumn] = useState('id')
    const [sortDirection, setSortDirection] = useState('asc')

    // Filters
    const [pincodeFilter, setPincodeFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    useEffect(() => {
        fetchApplicants()
    }, [applicationId])

    useEffect(() => {
        applyFiltersAndSort()
    }, [applicants, pincodeFilter, statusFilter, sortColumn, sortDirection])

    const fetchApplicants = async () => {
        const token = localStorage.getItem('staffAccessToken')

        try {
            const response = await fetch(`https://api.gramsamruddhi.in/zp-staff/${applicationId}/applicants`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.result && data.data) {
                setApplicants(data.data.applicants || [])
                setPublishMerit(data.data.publishMerit || false)
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError('Failed to load applicants. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const applyFiltersAndSort = () => {
        let result = [...applicants]

        // Apply filters
        if (pincodeFilter) {
            result = result.filter(app => app.pincode.includes(pincodeFilter))
        }

        if (statusFilter) {
            result = result.filter(app => app.status.toLowerCase() === statusFilter.toLowerCase())
        }

        // Apply sorting
        result.sort((a, b) => {
            let aVal = a[sortColumn]
            let bVal = b[sortColumn]

            // Convert to numbers for numeric columns
            if (sortColumn === 'merit' || sortColumn === 'verifiedMerit') {
                aVal = parseFloat(aVal) || 0
                bVal = parseFloat(bVal) || 0
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

    const handlePublishMerit = () => {
        if (publishMerit) {
            navigate(`/zp-staff/${applicationId}/publish-merit`)
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
        setPincodeFilter('')
        setStatusFilter('')
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading applicants...</p>
                    </div>
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

                {error && <div className="error-message">{error}</div>}

                {/* Filters */}
                <div className="filters-section">
                    <div className="filter-group">
                        <label htmlFor="pincodeFilter">Filter by Pincode:</label>
                        <input
                            id="pincodeFilter"
                            type="text"
                            value={pincodeFilter}
                            onChange={(e) => setPincodeFilter(e.target.value)}
                            placeholder="Enter pincode"
                            className="filter-input"
                        />
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
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                            <option value="pending">Pending</option>
                            <option value="rectification">Rectification</option>
                        </select>
                    </div>

                    {(pincodeFilter || statusFilter) && (
                        <button onClick={clearFilters} className="clear-filters-btn">
                            Clear Filters
                        </button>
                    )}
                </div>

                {/* Results count */}
                <div className="results-info">
                    Showing {startIndex + 1} - {Math.min(endIndex, filteredApplicants.length)} of {filteredApplicants.length} applicants
                </div>

                {/* Table */}
                {filteredApplicants.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <p>No applicants found</p>
                    </div>
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
                                    <th onClick={() => handleSort('pincode')} className="sortable">
                                        Pincode {getSortIcon('pincode')}
                                    </th>
                                    <th onClick={() => handleSort('merit')} className="sortable">
                                        Merit {getSortIcon('merit')}
                                    </th>
                                    <th onClick={() => handleSort('verifiedMerit')} className="sortable">
                                        Verified Merit {getSortIcon('verifiedMerit')}
                                    </th>
                                    <th onClick={() => handleSort('status')} className="sortable">
                                        Status {getSortIcon('status')}
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
                                        <td>{applicant.pincode}</td>
                                        <td>{applicant.merit}</td>
                                        <td>{applicant.verifiedMerit}</td>
                                        <td>
                        <span className={`status-badge status-${applicant.status.toLowerCase()}`}>
                          {applicant.status}
                        </span>
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

                {/* Publish Merit Button */}
                <div className="action-section">
                    <button
                        className={`publish-merit-btn ${publishMerit ? 'enabled' : 'disabled'}`}
                        onClick={handlePublishMerit}
                        disabled={!publishMerit}
                        title={!publishMerit ? 'Not yet eligible for publishing merit list' : 'Publish merit list'}
                    >
                        Publish Merit
                    </button>
                    {!publishMerit && (
                        <p className="publish-hint">Not yet eligible for publishing merit list</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Applicants
