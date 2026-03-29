import React from 'react'
import './sharedUi.css'

const EmptyState = ({ icon = '•', title, description, actions = null }) => {
    return (
        <div className="shared-state">
            <div className="shared-state__icon">{icon}</div>
            {title && <h2 className="shared-state__title">{title}</h2>}
            {description && <p className="shared-state__description">{description}</p>}
            {actions && <div className="shared-state__actions">{actions}</div>}
        </div>
    )
}

export default EmptyState
