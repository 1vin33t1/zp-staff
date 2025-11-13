import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './CreateApplication.css'

const CreateApplication = () => {
    const navigate = useNavigate()

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        localLanguage: '',
        region: '',
        banner: '',
        description: '',
        startDate: '',
        endDate: '',
        rectificationStartDate: '',
        rectificationEndDate: '',
        publish: false
    })

    // UI state
    const [regions, setRegions] = useState([])
    const [loadingRegions, setLoadingRegions] = useState(true)
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [uploadingDescription, setUploadingDescription] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [dateError, setDateError] = useState('')
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    // Fetch regions on mount with retry logic
    useEffect(() => {
        fetchRegions()
    }, [])

    const fetchRegions = async (retryCount = 0) => {
        const maxRetries = 3
        const token = localStorage.getItem('accessToken')

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/eligible-region', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.result && data.data && data.data.region) {
                setRegions(data.data.region)
                setLoadingRegions(false)
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            if (retryCount < maxRetries - 1) {
                setTimeout(() => fetchRegions(retryCount + 1), 1000)
            } else {
                setError('Failed to load regions after 3 attempts. Please refresh the page.')
                setLoadingRegions(false)
            }
        }
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        setError('')
        setDateError('')
    }

    // Date validation function
    const validateDates = () => {
        const { startDate, endDate, rectificationStartDate, rectificationEndDate } = formData

        // Check if End Date > Start Date
        if (startDate && endDate) {
            if (new Date(endDate) <= new Date(startDate)) {
                setDateError('End Date must be greater than Start Date')
                return false
            }
        }

        // Check if Rectification Start Date > End Date
        if (endDate && rectificationStartDate) {
            if (new Date(rectificationStartDate) <= new Date(endDate)) {
                setDateError('Rectification Start Date must be greater than End Date')
                return false
            }
        }

        // Check if Rectification End Date > Rectification Start Date
        if (rectificationStartDate && rectificationEndDate) {
            if (new Date(rectificationEndDate) <= new Date(rectificationStartDate)) {
                setDateError('Rectification End Date must be greater than Rectification Start Date')
                return false
            }
        }

        // If Rectification Start Date is present, Rectification End Date is required
        if (rectificationStartDate && !rectificationEndDate) {
            setDateError('Rectification End Date is required when Rectification Start Date is provided')
            return false
        }

        return true
    }

    const handleFileUpload = async (field, file) => {
        const token = localStorage.getItem('accessToken')
        const setLoading = field === 'banner' ? setUploadingBanner : setUploadingDescription

        setLoading(true)
        setError('')

        try {
            const formDataUpload = new FormData()
            formDataUpload.append('file', file)

            const response = await fetch('https://api.gramsamruddhi.in/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Bucket-Name': 'public'
                },
                body: formDataUpload
            })

            const data = await response.json()

            if (data.result && data.data) {
                handleInputChange(field, data.data)
            } else {
                throw new Error('Upload failed')
            }
        } catch (err) {
            setError(`Failed to upload ${field}. Please try again.`)
        } finally {
            setLoading(false)
        }
    }

    const getTodayDate = () => {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const getDateMinus60Days = () => {
        const today = new Date();
        today.setDate(today.getDate() - 60); // subtract 60 days

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const formatDateToDDMMYYYY = (dateString) => {
        if (!dateString) return ''
        const [year, month, day] = dateString.split('-')
        return `${day}-${month}-${year}`
    }

    const isMandatoryFieldsFilled = () => {
        return formData.name.trim() !== '' &&
            formData.localLanguage.trim() !== '' &&
            formData.region !== '' &&
            formData.banner !== '' &&
            formData.description !== '' &&
            formData.startDate !== '' &&
            formData.endDate !== ''
    }

    const handleSubmitClick = () => {
        if (!isMandatoryFieldsFilled()) {
            setError('Please fill all mandatory fields before submitting')
            return
        }

        // Validate dates
        if (!validateDates()) {
            return
        }

        setShowDisclaimer(true)
    }

    const handleConfirmSubmit = async () => {
        setShowDisclaimer(false)
        setSubmitting(true)
        setError('')

        const token = localStorage.getItem('accessToken')

        const payload = {
            name: formData.name,
            localLanguage: formData.localLanguage,
            region: formData.region,
            banner: formData.banner,
            description: formData.description,
            startDate: formatDateToDDMMYYYY(formData.startDate),
            endDate: formatDateToDDMMYYYY(formData.endDate),
            rectificationStartDate: formData.rectificationStartDate ? formatDateToDDMMYYYY(formData.rectificationStartDate) : '',
            rectificationEndDate: formData.rectificationEndDate ? formatDateToDDMMYYYY(formData.rectificationEndDate) : '',
            publish: formData.publish
        }

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/create-application', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()

            if (data.result && data.data === 'success') {
                setSubmitSuccess(true)
                setTimeout(() => {
                    navigate('/zp-staff/dashboard')
                }, 2000)
            } else {
                throw new Error('Submission failed')
            }
        } catch (err) {
            setError('Failed to create application. Please try again.')
            setSubmitting(false)
        }
    }

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>Create Application</h1>
                    <p>Fill in the details below to create a new application</p>
                </div>

                {submitSuccess && (
                    <div className="success-banner">
                        <div className="success-icon">✓</div>
                        <div>Application successfully created!</div>
                    </div>
                )}

                {error && <div className="error-message">{error}</div>}
                {dateError && <div className="error-message">{dateError}</div>}

                <div className="form-container">
                    {/* Name */}
                    <div className="form-field">
                        <label htmlFor="name">Name of Application <span className="required">*</span></label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter application name"
                            disabled={submitting}
                        />
                    </div>

                    {/* Local Language */}
                    <div className="form-field">
                        <label htmlFor="localLanguage">Local Language for Application <span className="required">*</span></label>
                        <input
                            id="localLanguage"
                            type="text"
                            value={formData.localLanguage}
                            onChange={(e) => handleInputChange('localLanguage', e.target.value)}
                            placeholder="Enter Local Language"
                            disabled={submitting}
                        />
                    </div>

                    {/* Region */}
                    <div className="form-field">
                        <label htmlFor="region">Region <span className="required">*</span></label>
                        {loadingRegions ? (
                            <div className="loading-text">Loading regions...</div>
                        ) : (
                            <select
                                id="region"
                                value={formData.region}
                                onChange={(e) => handleInputChange('region', e.target.value)}
                                disabled={submitting}
                            >
                                <option value="">Select a region</option>
                                {regions.map((region, index) => (
                                    <option key={index} value={region}>{region}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Banner */}
                    <div className="form-group">
                        <label className="form-label">
                            Banner <span className="required">*</span>
                        </label>
                        <div className="upload-section">
                            <input
                                type="file"
                                id="bannerFile"
                                onChange={(e) => handleFileUpload('banner',e.target.files[0])}
                                accept="image/*"
                                disabled={uploadingBanner}
                                className="file-input-hidden"
                            />
                            <label htmlFor="bannerFile" className={`upload-btn ${formData.banner ? 'uploaded' : ''}`}>
                                {uploadingBanner ? '⏳ Uploading...' : formData.banner ? '✓ Uploaded' : '📤 Upload Banner'}
                            </label>
                            {formData.banner && (
                                <div className="upload-filename">{formData.banner}</div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">
                            Description <span className="required">*</span>
                        </label>
                        <div className="upload-section">
                            <input
                                type="file"
                                id="descriptionFile"
                                onChange={(e) => handleFileUpload('description', e.target.files[0])}
                                accept=".pdf"
                                disabled={uploadingDescription}
                                className="file-input-hidden"
                            />
                            <label htmlFor="descriptionFile" className={`upload-btn ${formData.description ? 'uploaded' : ''}`}>
                                {uploadingDescription ? '⏳ Uploading...' : formData.description ? '✓ Uploaded' : '📤 Upload Description'}
                            </label>
                            {formData.description && (
                                <div className="upload-filename">{formData.description}</div>
                            )}
                        </div>
                    </div>


                    {/* Start Date */}
                    <div className="form-field">
                        <label htmlFor="startDate">Start Date <span className="required">*</span></label>
                        <input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            min={getDateMinus60Days()}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    {/* End Date */}
                    <div className="form-field">
                        <label htmlFor="endDate">End Date <span className="required">*</span></label>
                        <input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            min={formData.startDate || getTodayDate()}
                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    {/* Rectification Start Date */}
                    <div className="form-field">
                        <label htmlFor="rectificationStartDate">
                            Rectification Start Date
                            {formData.rectificationStartDate && <span className="required">*</span>}
                        </label>
                        <input
                            id="rectificationStartDate"
                            type="date"
                            value={formData.rectificationStartDate}
                            min={formData.endDate || getTodayDate()}
                            onChange={(e) => handleInputChange('rectificationStartDate', e.target.value)}
                            disabled={submitting}
                        />
                    </div>

                    {/* Rectification End Date */}
                    <div className="form-field">
                        <label htmlFor="rectificationEndDate">
                            Rectification End Date
                            {formData.rectificationStartDate && <span className="required">*</span>}
                        </label>
                        <input
                            id="rectificationEndDate"
                            type="date"
                            value={formData.rectificationEndDate}
                            min={formData.rectificationStartDate || getTodayDate()}
                            onChange={(e) => handleInputChange('rectificationEndDate', e.target.value)}
                            disabled={submitting || !formData.rectificationStartDate}
                        />
                        {formData.rectificationStartDate && !formData.rectificationEndDate && (
                            <span className="field-hint">Required when Rectification Start Date is provided</span>
                        )}
                    </div>

                    {/* Publish Checkbox */}
                    <div className="form-field checkbox-field">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.publish}
                                onChange={(e) => handleInputChange('publish', e.target.checked)}
                                disabled={submitting}
                            />
                            <span>Publish on HomePage</span>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="form-actions">
                        <button
                            className="secondary-btn"
                            onClick={() => navigate('/zp-staff/dashboard')}
                            disabled={submitting}
                        >
                            Back to Dashboard
                        </button>

                        <button
                            className="primary-btn"
                            onClick={handleSubmitClick}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </div>

                {/* Disclaimer Modal */}
                {showDisclaimer && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirm Submission</h3>
                            <p>Please verify all data before submitting the application. Thank you.</p>
                            <div className="modal-actions">
                                <button
                                    className="secondary-btn"
                                    onClick={() => setShowDisclaimer(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="primary-btn"
                                    onClick={handleConfirmSubmit}
                                >
                                    Confirm Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default CreateApplication
