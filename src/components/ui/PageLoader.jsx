import React from 'react'
import './sharedUi.css'

const PageLoader = ({ message = 'Loading...' }) => {
    return (
        <div className="shared-state">
            <div className="shared-spinner"></div>
            <p className="shared-state__description">{message}</p>
        </div>
    )
}

export default PageLoader
