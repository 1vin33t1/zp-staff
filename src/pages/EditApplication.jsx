import React from 'react'
import { useParams } from 'react-router-dom'
import './EditApplication.css'

const EditApplication = () => {
    const { applicationId } = useParams()

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>Edit Application</h1>
                    <p>Application ID: {applicationId}</p>
                </div>

                <div className="page-body">
                    <div className="placeholder-box">
                        <div className="placeholder-icon">✏️</div>
                        <p>Edit application form will be implemented here.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EditApplication
