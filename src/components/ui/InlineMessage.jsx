import React from 'react'
import './sharedUi.css'

const InlineMessage = ({ children, variant = 'error', className = '' }) => {
    if (!children) {
        return null
    }

    const classes = ['inline-message', `inline-message--${variant}`, className].filter(Boolean).join(' ')

    return <div className={classes}>{children}</div>
}

export default InlineMessage
