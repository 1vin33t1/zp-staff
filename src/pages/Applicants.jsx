import React from 'react'
import { useParams } from 'react-router-dom'
import './Applicants.css'

const Applicants = () => {
    const { applicationId } = useParams()

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>Applicants</h1>
                    <p>Application ID: {applicationId}</p>
                </div>

                <div className="page-body">
                    <div className="placeholder-box">
                        <div className="placeholder-icon">👥</div>
                        <p>Applicants list will be implemented here.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Applicants
