import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import { getStaffUserInfo } from '../lib/authStorage'

const StaffProfile = () => {
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [profileData, setProfileData] = useState({
        name: '',
        postedRegion: '',
        designatedRegion: [],
        phoneCode: '+91',
        mobile: ''
    })
    const [formData, setFormData] = useState({
        postedRegion: '',
        designatedRegion: [],
        phoneCode: '+91',
        mobile: ''
    })
    const [validationError, setValidationError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const data = await fetchJson('/zp-staff/profile', {
                method: 'GET',
                headers: createAuthHeaders(),
            })
            const userData = getStaffUserInfo() || {}

            if (data.result && data.data) {
                setProfileData({
                    name: userData.name || '',
                    designatedRegion: Array.isArray(data.data.designatedRegion) ? data.data.designatedRegion : [],
                    postedRegion: Array.isArray(data.data.postedRegion) ? data.data.postedRegion.join(",") : '',
                    phoneCode: data.data.phoneCode || '+91',
                    mobile: data.data.mobile || ''
                })

                setFormData({
                    designatedRegion: Array.isArray(data.data.designatedRegion) ? data.data.designatedRegion : [],
                    postedRegion: Array.isArray(data.data.postedRegion) ? data.data.postedRegion.join(",") : '',
                    phoneCode: data.data.phoneCode || '+91',
                    mobile: data.data.mobile || ''
                })
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setError('Failed to load profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const validateMobile = (mobileNumber) => {
        // Must be exactly 10 digits
        const mobileRegex = /^\d{10}$/
        return mobileRegex.test(mobileNumber)
    }

    const validateForm = () => {
        setValidationError('')

        // Validate mobile
        if (!formData.mobile || formData.mobile.trim() === '') {
            setValidationError('Mobile number is required')
            return false
        }

        if (!validateMobile(formData.mobile.trim())) {
            setValidationError('Mobile number must be exactly 10 digits')
            return false
        }

        return true
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target

        if (name === 'mobile') {
            // Only allow digits for mobile
            const numericValue = value.replace(/\D/g, '').slice(0, 10)
            setFormData(prev => ({ ...prev, [name]: numericValue }))

            // Clear validation error when user starts typing
            if (validationError) {
                setValidationError('')
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))

            // Clear validation error when user starts typing
            if (validationError) {
                setValidationError('')
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setSubmitting(true)
        setError('')

        const payload = {
            phoneCode: formData.phoneCode,
            mobile: formData.mobile
        }

        try {
            const data = await fetchJson('/zp-staff/profile', {
                method: 'POST',
                headers: createAuthHeaders({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(payload)
            })

            if (data.result && data.data && data.data === "success") {
                setSubmitSuccess(true)

                // Update profile data
                setProfileData(prev => ({
                    ...prev,
                    mobile: formData.mobile
                }))

                // Auto-redirect after 2 seconds
                setTimeout(() => {
                    navigate('/zp-staff/dashboard')
                }, 2000)
            } else {
                throw new Error('Submission failed')
            }
        } catch (err) {
            setError('Failed to update profile. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDashboard = () => {
        navigate('/zp-staff/dashboard')
    }

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading profile...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (submitSuccess) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="success-state">
                        <div className="success-icon">✓</div>
                        <h2>Profile Updated Successfully</h2>
                        <p>Redirecting to dashboard...</p>
                    </div>
                </div>
            </div>
        )
    }

    const postedRegion = profileData.postedRegion ? profileData.postedRegion : 'Not yet posted to any taluka'
    const designatedRegion = profileData.designatedRegion.length > 0 ? profileData.designatedRegion.join(', ') : 'No taluka assigned'

    return (
        <div className="page-container">
            <div className="profile-container">
                {/* Header */}
                <div className="profile-header">
                    <h1>Staff Profile</h1>
                    <p className="profile-subtitle">Update your profile information</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Profile Form */}
                <form onSubmit={handleSubmit} className="profile-form">
                    {/* Name - Inline */}
                    <div className="form-row">
                        <div className="form-item">
                            <label className="form-label">Name</label>
                            <div className="display-field">
                                {profileData.name || 'Not provided'}
                            </div>
                        </div>
                    </div>

                    {/* Posted Regions - Inline */}
                    <div className="form-row">
                        <div className="form-item">
                            <label className="form-label">Posted Taluka</label>
                            <div className="display-field">
                                {postedRegion}
                            </div>
                        </div>
                    </div>

                    {/* Assigned Region - Inline */}
                    <div className="form-row">
                        <div className="form-item">
                            <label className="form-label">Assigned Taluka</label>
                            <div className="display-field">
                                {designatedRegion}
                            </div>
                        </div>
                    </div>

                    {/* Mobile - Inline */}
                    <div className="form-row">
                        <div className="form-item">
                            <label className="form-label required">Mobile</label>
                            <div className="mobile-input-group">
                                <div className="phone-code-section">+91</div>
                                <input
                                    type="text"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleInputChange}
                                    placeholder="10-digit number"
                                    maxLength="10"
                                    className="mobile-input"
                                    disabled={submitting}
                                />
                            </div>
                            <div className="char-counter">{formData.mobile.length}/10</div>
                        </div>
                    </div>

                    {/* Validation Error Popup */}
                    {validationError && (
                        <div className="validation-error-popup">
                            <span className="error-icon">⚠️</span>
                            <span>{validationError}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="action-buttons">
                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={handleDashboard}
                            disabled={submitting}
                        >
                            Dashboard
                        </button>
                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>

            </div>
            <style jsx>{`
                .profile-container {
                    max-width: 550px;
                    margin: 0 auto;
                    padding: 1.5rem;
                }

                /* Header */
                .profile-header {
                    margin-bottom: 1.5rem;
                    text-align: center;
                }

                .profile-header h1 {
                    color: #1f2937;
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin: 0 0 0.25rem 0;
                }

                .profile-subtitle {
                    color: #6b7280;
                    font-size: 0.9rem;
                    margin: 0;
                }

                /* Loading State */
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    gap: 0.75rem;
                }

                .spinner {
                    width: 45px;
                    height: 45px;
                    border: 4px solid #e5e7eb;
                    border-top-color: #2e7d32;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Success State */
                .success-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 300px;
                    gap: 0.75rem;
                }

                .success-icon {
                    width: 70px;
                    height: 70px;
                    background: #16a34a;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    animation: scaleIn 0.5s ease;
                }

                @keyframes scaleIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }

                .success-state h2 {
                    color: #16a34a;
                    margin: 0;
                    font-size: 1.25rem;
                }

                .success-state p {
                    color: #6b7280;
                    font-size: 0.9rem;
                    margin: 0;
                }

                /* Form */
                .profile-form {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 10px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                /* Form Row - Inline Layout */
                .form-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 1.2rem;
                }

                .form-row:last-of-type:not(.action-buttons) {
                    margin-bottom: 1rem;
                }

                .form-item {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .form-label {
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    flex-shrink: 0;
                    padding-top: 0.05rem;
                }

                .form-label.required::after {
                    content: ' *';
                    color: #dc2626;
                }

                /* Display Fields (Read-only) */
                .display-field {
                    padding: 0.7rem 0.75rem;
                    background: #f3f4f6;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    color: #374151;
                    font-weight: 500;
                    font-size: 0.9rem;
                    min-height: 38px;
                    display: flex;
                    align-items: center;
                    word-break: break-word;
                }

                /* Text Input */
                .form-input {
                    padding: 0.7rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    transition: border-color 0.2s ease;
                    font-family: inherit;
                    width: 100%;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #2e7d32;
                    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
                }

                .form-input:disabled {
                    background: #f9fafb;
                    color: #9ca3af;
                    cursor: not-allowed;
                }

                /* Mobile Input Group */
                .mobile-input-group {
                    display: flex;
                    gap: 0;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    overflow: hidden;
                    transition: border-color 0.2s ease;
                }

                .mobile-input-group:focus-within {
                    border-color: #2e7d32;
                    box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
                }

                .phone-code-section {
                    display: flex;
                    align-items: center;
                    padding: 0.7rem 0.75rem;
                    background: #f3f4f6;
                    border-right: 1px solid #e5e7eb;
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    min-width: 48px;
                    justify-content: center;
                }

                .mobile-input {
                    flex: 1;
                    padding: 0.7rem 0.75rem;
                    border: none;
                    font-size: 0.9rem;
                    font-family: inherit;
                    background: white;
                }

                .mobile-input:focus {
                    outline: none;
                }

                .mobile-input::placeholder {
                    color: #9ca3af;
                }

                .mobile-input:disabled {
                    background: #f9fafb;
                    color: #9ca3af;
                    cursor: not-allowed;
                }

                /* Character Counter */
                .char-counter {
                    margin-top: 0.2rem;
                    font-size: 0.75rem;
                    color: #9ca3af;
                    text-align: right;
                }

                /* Error Message */
                .error-message {
                    padding: 0.75rem;
                    background: #fee2e2;
                    border: 1px solid #fca5a5;
                    color: #991b1b;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                /* Validation Error Popup */
                .validation-error-popup {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem;
                    background: #fef2f2;
                    border: 1px solid #fca5a5;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                    animation: slideDown 0.3s ease;
                    font-size: 0.85rem;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .error-icon {
                    font-size: 1rem;
                    flex-shrink: 0;
                }

                .validation-error-popup {
                    color: #991b1b;
                    font-weight: 500;
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e5e7eb;
                }

                .action-buttons button {
                    flex: 1;
                    padding: 0.8rem;
                    font-size: 0.95rem;
                    font-weight: 700;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .primary-btn {
                    background: #2e7d32;
                    color: white;
                }

                .primary-btn:hover:not(:disabled) {
                    background: #1b5e20;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(46, 125, 50, 0.2);
                }

                .primary-btn:disabled {
                    background: #d1d5db;
                    color: #9ca3af;
                    cursor: not-allowed;
                }

                .secondary-btn {
                    background: white;
                    color: #2e7d32;
                    border: 1.5px solid #2e7d32;
                }

                .secondary-btn:hover:not(:disabled) {
                    background: #f0fdf4;
                    transform: translateY(-1px);
                }

                .secondary-btn:disabled {
                    border-color: #d1d5db;
                    color: #9ca3af;
                    cursor: not-allowed;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .profile-container {
                        padding: 1rem;
                    }

                    .profile-header h1 {
                        font-size: 1.5rem;
                        margin-bottom: 0.5rem;
                    }

                    .profile-form {
                        padding: 1.25rem;
                    }

                    .form-row {
                        flex-direction: column;
                        gap: 0.3rem;
                        margin-bottom: 1rem;
                    }

                    .form-label {
                        white-space: normal;
                    }

                    .action-buttons {
                        flex-direction: column;
                        gap: 0.5rem;
                        margin-top: 1rem;
                        padding-top: 1rem;
                    }

                    .action-buttons button {
                        padding: 0.75rem;
                    }
                }

                /* Page Container */
                .page-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #fafaf9 0%, #f0fdf4 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }

                .page-content {
                    width: 100%;
                }

            `
            }
            </style>
        </div>
    )
}

export default StaffProfile
