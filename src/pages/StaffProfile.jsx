import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson } from '../lib/api'
import { getStaffUserInfo, setStaffUserInfo } from '../lib/authStorage'
import InlineMessage from '../components/ui/InlineMessage'
import PageLoader from '../components/ui/PageLoader'
import PageSuccessState from '../components/ui/PageSuccessState'
import './StaffProfile.css'

const StaffProfile = () => {
    const navigate = useNavigate()

    // State
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [profileData, setProfileData] = useState({
        name: '',
        postedRegion: '',
        designation: '',
        phoneCode: '+91',
        mobile: ''
    })
    const [formData, setFormData] = useState({
        postedRegion: '',
        designation: '',
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
                const nextUserInfo = {
                    ...userData,
                    name: userData.name || data.data.userId || '',
                    designation: data.data.designation || '',
                }
                setStaffUserInfo(nextUserInfo)
                setProfileData({
                    name: nextUserInfo.name,
                    designation: data.data.designation || '',
                    postedRegion: Array.isArray(data.data.postedRegion) ? data.data.postedRegion.join(",") : '',
                    phoneCode: data.data.phoneCode || '+91',
                    mobile: data.data.mobile || ''
                })

                setFormData({
                    designation: data.data.designation || '',
                    postedRegion: Array.isArray(data.data.postedRegion) ? data.data.postedRegion.join(",") : '',
                    phoneCode: data.data.phoneCode || '+91',
                    mobile: data.data.mobile || ''
                })
            } else {
                throw new Error('Invalid response format')
            }
        } catch {
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
        } catch {
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
                    <PageLoader message="Loading profile..." />
                </div>
            </div>
        )
    }

    if (submitSuccess) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageSuccessState
                        title="Profile Updated Successfully"
                        description="Redirecting to dashboard..."
                    />
                </div>
            </div>
        )
    }

    const postedRegion = profileData.postedRegion ? profileData.postedRegion : 'Not yet posted to any taluka'
    const designation = profileData.designation || 'Not provided'

    return (
        <div className="page-container">
            <div className="profile-container">
                {/* Header */}
                <div className="profile-header">
                    <h1>Staff Profile</h1>
                    <p className="profile-subtitle">Update your profile information</p>
                </div>

                <InlineMessage>{error}</InlineMessage>

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

                    {/* Designation - Inline */}
                    <div className="form-row">
                        <div className="form-item">
                            <label className="form-label">Designation</label>
                            <div className="display-field">
                                {designation}
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
        </div>
    )
}

export default StaffProfile
