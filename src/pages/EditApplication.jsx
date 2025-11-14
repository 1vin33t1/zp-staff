import React, {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import './EditApplication.css'

const EditApplication = () => {
    const navigate = useNavigate()
    const {applicationId} = useParams()

    // Data from API
    const [eligibilityData, setEligibilityData] = useState({
        anganwadiList: [],
        postedTaluka: []
    })

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        taluka: '',
        gramPanchayatList: [],
        anganwadiList: [],
        banner: '',
        description: '',
        startDate: '',
        endDate: '',
        publish: false
    })

    // UI state
    const [validationErrors, setValidationErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [loadingEligibility, setLoadingEligibility] = useState(true)
    const [loadingEditApplication, setLoadingEditApplication] = useState(true)
    const [errorBreaking, setErrorBreaking] = useState('')
    const [errorRetry, setErrorRetry] = useState('')

    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [uploadingDescription, setUploadingDescription] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    // Fetch regions and application data on mount
    useEffect(() => {
        fetchEligibilityData()
        fetchApplicationData()
    }, [applicationId])

    const naturalSort = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base'
    }).compare;

    const getTalukaOptions = (postedTaluka) => {
        return Array.isArray(postedTaluka) ? postedTaluka : []
    }

    const getGramPanchayatOptions = (anganwadiList, selectedTaluka) => {
        if (!selectedTaluka || !Array.isArray(anganwadiList)) return []
        const filtered = anganwadiList.filter(item => item.taluka === selectedTaluka)
        const gramPanchayats = [...new Set(filtered.map(item => item.gramPanchayat))]
        return gramPanchayats.sort(naturalSort)
    }

    const getAnganwadiOptions = (anganwadiList, selectedTaluka, selectedGramPanchayats) => {
        if (!selectedTaluka || !Array.isArray(anganwadiList) || !Array.isArray(selectedGramPanchayats)) return []
        const filtered = anganwadiList.filter(item =>
            item.taluka === selectedTaluka && selectedGramPanchayats.includes(item.gramPanchayat)
        )
        const anganwadis = [...new Set(filtered.map(item => item.name))]
        return anganwadis.sort(naturalSort)
    }

    const renderCheckboxGrid = (items, selectedItems, onItemChange) => {
        const itemsPerRow = 5
        const rows = []
        for (let i = 0; i < items.length; i += itemsPerRow) {
            rows.push(items.slice(i, i + itemsPerRow))
        }
        return (
            <div className="checkbox-grid">
                {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="checkbox-row">
                        {row.map((item) => (
                            <label key={item} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item)}
                                    onChange={(e) => {
                                        const updated = e.target.checked
                                            ? [...selectedItems, item]
                                            : selectedItems.filter(i => i !== item)
                                        onItemChange(updated)
                                    }}
                                />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>
                ))}
            </div>
        )
    }

    const fetchEligibilityData = async () => {
        const token = localStorage.getItem('staffAccessToken')

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/eligibility', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.result && data.data) {
                setEligibilityData({
                    anganwadiList: data.data.anganwadiList || [],
                    postedTaluka: data.data.postedTaluka || []
                })

                if (data.data.postedTaluka && data.data.postedTaluka.length === 1) {
                    setFormData(prev => ({
                        ...prev,
                        taluka: data.data.postedTaluka[0]
                    }))
                    handleTalukaChange({target: {value: data.data.postedTaluka[0]}});
                }
            } else {
                throw new Error('Invalid response')
            }
        } catch (err) {
            setErrorBreaking('Failed to load eligibility data. Please try again.')
        } finally {
            setLoadingEligibility(false)
        }
    }

    const isEditAllowed = eligibilityData.postedTaluka.includes(formData.taluka)

    const talukaOptions = getTalukaOptions(eligibilityData.postedTaluka)
    const gramPanchayatOptions = getGramPanchayatOptions(
        eligibilityData.anganwadiList,
        formData.taluka
    )
    const anganwadiOptions = getAnganwadiOptions(
        eligibilityData.anganwadiList,
        formData.taluka,
        formData.gramPanchayatList
    )

    const handleTalukaChange = (e) => {
        const selectedTaluka = e.target.value
        setFormData(prev => ({
            ...prev,
            taluka: selectedTaluka,
            gramPanchayatList: [],
            anganwadiList: []
        }))

        if (validationErrors.taluka) {
            setValidationErrors(prev => ({...prev, taluka: ''}))
        }
    }

    const handleGramPanchayatChange = (updated) => {
        setFormData(prev => ({
            ...prev,
            gramPanchayatList: updated,
            anganwadiList: []
        }))

        if (validationErrors.gramPanchayatList) {
            setValidationErrors(prev => ({...prev, gramPanchayatList: ''}))
        }
    }

    const handleAnganwadiChange = (updated) => {
        setFormData(prev => ({
            ...prev,
            anganwadiList: updated
        }))

        if (validationErrors.anganwadiList) {
            setValidationErrors(prev => ({...prev, anganwadiList: ''}))
        }
    }

    const fetchApplicationData = async () => {
        const token = localStorage.getItem('staffAccessToken')

        try {
            const response = await fetch(`https://api.gramsamruddhi.in/zp-staff/${applicationId}/edit-application`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.result && data.data) {
                const appData = data.data
                setFormData({
                    id: appData.id,
                    name: appData.name || '',
                    taluka: appData.taluka || '',
                    gramPanchayatList: appData.gramPanchayatList || [],
                    anganwadiList: appData.anganwadiList || [],
                    banner: appData.banner || '',
                    description: appData.description || '',
                    startDate: convertDateToInput(appData.startDate) || '',
                    endDate: convertDateToInput(appData.endDate) || '',
                    publish: appData.publish || false
                })
            } else {
                throw new Error('Invalid response format')
            }
        } catch (err) {
            setErrorBreaking('Failed to load application data. Please try again.')
        } finally {
            setLoadingEditApplication(false)
        }
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({...prev, [field]: value}))
        setErrorRetry('')
    }

    const validateForm = () => {
        const errors = {}

        if (!formData.name || formData.name.trim() === '') {
            errors.name = 'Application name is required'
        }

        if (!formData.taluka) {
            errors.taluka = 'Taluka is required'
        }

        if (formData.gramPanchayatList.length === 0) {
            errors.gramPanchayatList = 'At least one Gram Panchayat is required'
        }

        if (formData.anganwadiList.length === 0) {
            errors.anganwadiList = 'At least one Anganwadi is required'
        }

        if (!formData.banner) {
            errors.banner = 'Banner is required'
        }

        if (!formData.description) {
            errors.description = 'Description is required'
        }

        if (!formData.startDate) {
            errors.startDate = 'Start date is required'
        }

        if (!formData.endDate) {
            errors.endDate = 'End date is required'
        }

        if (formData.startDate && formData.endDate) {
            if (new Date(formData.endDate) <= new Date(formData.startDate)) {
                errors.endDate = 'End date must be greater than start date'
            }
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }


    const validateDates = () => {
        const {startDate, endDate} = formData
        if (startDate && endDate) {
            if (new Date(endDate) <= new Date(startDate)) {
                return false
            }
        }
        return true
    }


    const handleFileUpload = async (field, file) => {
        const token = localStorage.getItem('staffAccessToken')
        const setLoading = field === 'banner' ? setUploadingBanner : setUploadingDescription

        setLoading(true)
        setErrorRetry('')

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
            setErrorRetry(`Failed to upload ${field}. Please try again.`)
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

    const convertDateToInput = (dateStr) => {
        if (!dateStr) return ''
        const parts = dateStr.split('-')
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}` // DD-MM-YYYY
        }
        return dateStr
    }

    const convertDateToAPI = (dateStr) => {
        if (!dateStr) return ''
        const parts = dateStr.split('-')
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}` // DD-MM-YYYY
        }
        return dateStr
    }

    const isMandatoryFieldsFilled = () => {
        return formData.name.trim() !== '' &&
            formData.taluka !== '' &&
            formData.gramPanchayatList?.length > 0 &&
            formData.anganwadiList?.length > 0 &&
            formData.banner !== '' &&
            formData.description !== '' &&
            formData.startDate !== '' &&
            formData.endDate !== ''
    }

    const handleSubmitClick = () => {
        if (!isMandatoryFieldsFilled()) {
            setErrorRetry('Please fill all mandatory fields before submitting')
            return
        }

        // Validate dates
        if (!validateDates()) {
            return
        }

        setShowDisclaimer(true)
    }

    const handleConfirmSubmit = async () => {
        if (!validateForm()) {
            return
        }
        setShowDisclaimer(false)
        setSubmitting(true)
        setErrorRetry('')

        const token = localStorage.getItem('staffAccessToken')

        const payload = {
            id: formData.id,
            name: formData.name,
            taluka: formData.taluka,
            gramPanchayatList: formData.gramPanchayatList,
            anganwadiList: formData.anganwadiList,
            banner: formData.banner,
            description: formData.description,
            startDate: convertDateToAPI(formData.startDate),
            endDate: convertDateToAPI(formData.endDate),
            publish: formData.publish
        }

        try {
            const response = await fetch('https://api.gramsamruddhi.in/zp-staff/edit-application', {
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
                    navigate('/zp-staff/view-application')
                }, 2000)
            } else {
                throw new Error('Submission failed')
            }
        } catch (err) {
            setErrorRetry('Failed to update application. Please try again.')
            setSubmitting(false)
        }
    }

    if (loading || loadingEditApplication || loadingEligibility) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading application data...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!isEditAllowed) {
        return (
            <div className="error-box">
                <p>❌ You have not been posted to application taluka.</p>
                <p>To edit this application, you need to be posted to the same taluka.</p>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>Edit Application</h1>
                    <p>Update the application details below</p>
                </div>

                {submitSuccess && (
                    <div className="success-banner">
                        <div className="success-icon">✓</div>
                        <div>Application successfully updated!</div>
                    </div>
                )}

                {errorRetry && <div className="error-message">{errorRetry}</div>}
                {errorBreaking && <div className="error-message">{errorBreaking}</div>}
                {!errorBreaking && <div className="form-container">
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

                    {/* Taluka Selection */}
                    <div className="form-group">
                        <label>Taluka *</label>
                        {talukaOptions.length === 1 ? (
                            <div className="display-field">
                                {talukaOptions[0]} (Auto-selected)
                            </div>
                        ) : (
                            <select
                                value={formData.taluka}
                                onChange={handleTalukaChange}
                                disabled={submitting}
                            >
                                <option value="">Select Taluka</option>
                                {talukaOptions.map(taluka => (
                                    <option key={taluka} value={taluka}>
                                        {taluka}
                                    </option>
                                ))}
                            </select>
                        )}
                        {validationErrors.taluka && <span className="error">{validationErrors.taluka}</span>}
                    </div>

                    {/* Gram Panchayat Selection */}
                    {formData.taluka && (
                        <div className="form-group">
                            <label>Gram Panchayat * ({formData.gramPanchayatList.length} selected)</label>
                            {gramPanchayatOptions.length > 0 ? (
                                renderCheckboxGrid(
                                    gramPanchayatOptions,
                                    formData.gramPanchayatList,
                                    handleGramPanchayatChange
                                )
                            ) : (
                                <p className="no-options">No Gram Panchayats available for selected Taluka</p>
                            )}
                            {validationErrors.gramPanchayatList && (
                                <span className="error">{validationErrors.gramPanchayatList}</span>
                            )}
                        </div>
                    )}

                    {/* Anganwadi Selection */}
                    {formData.gramPanchayatList.length > 0 && (
                        <div className="form-group">
                            <label>Anganwadi * ({formData.anganwadiList.length} selected)</label>
                            {anganwadiOptions.length > 0 ? (
                                renderCheckboxGrid(
                                    anganwadiOptions,
                                    formData.anganwadiList,
                                    handleAnganwadiChange
                                )
                            ) : (
                                <p className="no-options">No Anganwadis available for selected options</p>
                            )}
                            {validationErrors.anganwadiList && (
                                <span className="error">{validationErrors.anganwadiList}</span>
                            )}
                        </div>
                    )}

                    {/* Banner */}
                    <div className="form-group">
                        <label className="form-label">
                            Banner <span className="required">*</span>
                        </label>
                        <div className="upload-section">
                            <input
                                type="file"
                                id="bannerFile"
                                onChange={(e) => handleFileUpload('banner', e.target.files[0])}
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
                            <label htmlFor="descriptionFile"
                                   className={`upload-btn ${formData.description ? 'uploaded' : ''}`}>
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
                            onClick={() => navigate('/zp-staff/view-application')}
                            disabled={submitting}
                        >
                            Back to Applications
                        </button>

                        <button
                            className="primary-btn"
                            onClick={handleSubmitClick}
                            disabled={submitting}
                        >
                            {submitting ? 'Updating...' : 'Update Application'}
                        </button>
                    </div>
                </div>}

                {/* Disclaimer Modal */}
                {showDisclaimer && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Confirm Update</h3>
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
                                    Confirm Update
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EditApplication
