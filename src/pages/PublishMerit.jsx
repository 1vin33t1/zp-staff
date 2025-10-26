import React from 'react'
import { useParams } from 'react-router-dom'

const PublishMerit = () => {
    const { applicationId } = useParams()

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>Publish Merit List</h1>
                    <p>Application ID: {applicationId}</p>
                </div>

                <div className="page-body">
                    <div className="placeholder-box">
                        <div className="placeholder-icon">📊</div>
                        <p>Merit list publishing functionality will be implemented here.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PublishMerit
