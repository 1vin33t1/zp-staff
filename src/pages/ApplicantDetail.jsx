import React from 'react'
import { useParams } from 'react-router-dom'

const ApplicantDetail = () => {
    const { applicationId, applicantId } = useParams()

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>Applicant Details</h1>
                    <p>Application ID: {applicationId}</p>
                    <p>Applicant ID: {applicantId}</p>
                </div>

                <div className="page-body">
                    <div className="placeholder-box">
                        <div className="placeholder-icon">👤</div>
                        <p>Applicant detail view will be implemented here.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ApplicantDetail
