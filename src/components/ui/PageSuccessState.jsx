import React from 'react'
import './sharedUi.css'

const PageSuccessState = ({ title, description, icon = '✓' }) => {
    return (
        <div className="shared-state">
            <div className="shared-state__icon">{icon}</div>
            {title && <h2 className="shared-state__title">{title}</h2>}
            {description && <p className="shared-state__description">{description}</p>}
        </div>
    )
}

export default PageSuccessState
