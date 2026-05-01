import React from 'react'
import './sharedUi.css'

const ConfirmModal = ({
    isOpen,
    title,
    description,
    details = null,
    cancelLabel = 'Cancel',
    confirmLabel = 'Confirm',
    confirmButtonClassName = 'primary-btn',
    cancelDisabled = false,
    confirmDisabled = false,
    onCancel,
    onConfirm,
}) => {
    if (!isOpen) {
        return null
    }

    return (
        <div className="confirm-modal__overlay">
            <div className="confirm-modal">
                <h3 className="confirm-modal__title">{title}</h3>
                {description && <p className="confirm-modal__description">{description}</p>}
                {details && <div className="confirm-modal__details">{details}</div>}
                <div className="confirm-modal__actions">
                    <button className="secondary-btn" onClick={onCancel} disabled={cancelDisabled}>
                        {cancelLabel}
                    </button>
                    <button className={confirmButtonClassName} onClick={onConfirm} disabled={confirmDisabled}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmModal
