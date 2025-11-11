import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './StaffProfile.css'

const StaffProfile = () => {
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [profileData, setProfileData] = useState({
        name: '',
        region: [],
        currentRegion: '',
        phoneCode: '+91',
        mobile: ''
    })
    const [formData, setFormData] = useState({
        currentRegion: '',
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
        const token = localStorage.getItem('accessToken')

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.result && data.data) {
                setProfileData({
                    name: data.data.name || '',
                    region: Array.isArray(data.data.region) ? data.data.region : [],
                    currentRegion: data.data.currentRegion || '',
                    phoneCode: data.data.phoneCode || '+91',
                    mobile: data.data.mobile || ''
                })

                setFormData({
                    currentRegion: data.data.currentRegion || '',
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

        // Validate current region
        if (!formData.currentRegion || formData.currentRegion.trim() === '') {
            setValidationError('Current Region is required')
            return false
        }

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

        const token = localStorage.getItem('accessToken')

        const payload = {
            currentRegion: formData.currentRegion,
            phoneCode: formData.phoneCode,
            mobile: formData.mobile
        }

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/profile', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (data.result && data.data && data.data.success) {
                setSubmitSuccess(true)

                // Update profile data
                setProfileData(prev => ({
                    ...prev,
                    currentRegion: formData.currentRegion,
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

    const regionList = Array.isArray(profileData.region) ? profileData.region : []
    const regionDisplay = regionList.length > 0 ? regionList.join(', ') : 'No regions assigned'

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
                    <div className="form-grid">
                        {/* Name - Read Only */}
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <div className="display-field">
                                {profileData.name || 'Not provided'}
                            </div>
                        </div>

                        {/* Assigned Regions - Read Only */}
                        <div className="form-group">
                            <label className="form-label">Assigned Regions</label>
                            <div className="display-field">
                                {regionDisplay}
                            </div>
                        </div>

                        {/* Current Region - Editable */}
                        <div className="form-group full-width">
                            <label className="form-label required">Current Region</label>
                            <input
                                type="text"
                                name="currentRegion"
                                value={formData.currentRegion}
                                onChange={handleInputChange}
                                placeholder="Enter current region"
                                className="form-input"
                                disabled={submitting}
                            />
                        </div>

                        {/* Mobile - Editable */}
                        <div className="form-group full-width">
                            <label className="form-label required">Mobile Number</label>
                            <div className="mobile-input-group">
                                <div className="phone-code-section">
                                    <span className="phone-code-prefix">+91</span>
                                </div>
                                <input
                                    type="text"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleInputChange}
                                    placeholder="Enter 10-digit mobile number"
                                    maxLength="10"
                                    className="mobile-input"
                                    disabled={submitting}
                                />
                            </div>
                            <div className="char-counter">
                                {formData.mobile.length}/10 digits
                            </div>
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
        </div>
    )
}

export default StaffProfile
