import React, {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import './CreateApplication.css'

const CreateApplication = () => {
    const navigate = useNavigate()

    // Data from API
    const [eligibilityData, setEligibilityData] = useState({
        anganwadiList: [],
        postedTaluka: []
    })

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        taluka: '',
        gramPanchayatList: [],
        anganwadiList: [],
        banner: '',
        description: '',
        startDate: '',
        endDate: '',
        rectificationStartDate: '',
        rectificationEndDate: '',
        publish: false
    })

    const [validationErrors, setValidationErrors] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploadingBanner, setUploadingBanner] = useState(false)
    const [uploadingDescription, setUploadingDescription] = useState(false)

    useEffect(() => {
        fetchEligibilityData()
    }, [])

    const fetchEligibilityData = async () => {
        const token = localStorage.getItem('accessToken')

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

                // Auto-select single taluka if only one available
                if (data.data.postedTaluka && data.data.postedTaluka.length === 1) {
                    setFormData(prev => ({
                        ...prev,
                        taluka: data.data.postedTaluka
                    }))
                }
            } else {
                throw new Error('Invalid response')
            }
        } catch (err) {
            setError('Failed to load eligibility data. Please try again.')
        } finally {
            setLoading(false)
        }
    }

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

        // Clear validation error
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

    const handleInputChange = (e) => {
        const {name, value, type, checked} = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))

        if (validationErrors[name]) {
            setValidationErrors(prev => ({...prev, [name]: ''}))
        }
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

        if (formData.rectificationStartDate && formData.rectificationEndDate) {
            if (new Date(formData.rectificationEndDate) <= new Date(formData.rectificationStartDate)) {
                errors.rectificationEndDate = 'End date must be greater than start date'
            }
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const convertDateToAPI = (dateStr) => {
        if (!dateStr) return ''
        const parts = dateStr.split('-')
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}` // DD-MM-YYYY
        }
        return dateStr
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

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setSubmitting(true)
        setError('')

        const token = localStorage.getItem('accessToken')

        const payload = {
            name: formData.name,
            taluka: formData.taluka,
            gramPanchayatList: formData.gramPanchayatList,
            anganwadiList: formData.anganwadiList,
            banner: formData.banner,
            description: formData.description,
            startDate: convertDateToAPI(formData.startDate),
            endDate: convertDateToAPI(formData.endDate),
            rectificationStartDate: formData.rectificationStartDate
                ? convertDateToAPI(formData.rectificationStartDate)
                : null,
            rectificationEndDate: formData.rectificationEndDate
                ? convertDateToAPI(formData.rectificationEndDate)
                : null,
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

            if (data.result) {
                navigate('/zp-staff/applications')
            } else {
                throw new Error('Failed to create application')
            }
        } catch (err) {
            setError('Failed to create application. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="loading">Loading...</div>
    }

    // Check if user is posted to any taluka
    if (talukaOptions.length === 0) {
        return (
            <div className="error-box">
                <p>❌ You have not been posted to any taluka yet.</p>
                <p>To create an application, you need to be posted to at least one taluka.</p>
            </div>
        )
    }

    return (
        <div className="form-container">
            <h1>Create Application</h1>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
                {/* Application Name */}
                <div className="form-group">
                    <label>Application Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter application name"
                        disabled={submitting}
                    />
                    {validationErrors.name && <span className="error">{validationErrors.name}</span>}
                </div>

                {/* Taluka Selection */}
                <div className="form-group">
                    <label>Taluka *</label>
                    {talukaOptions.length === 1 ? (
                        <div className="display-field">
                            {talukaOptions} (Auto-selected)
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

                {/* Banner Upload */}
                <div className="form-group">
                    <label>Banner *</label>
                    <div className="upload-section">
                        <input
                            type="file"
                            id="bannerFile"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'banner')}
                            accept="image/*"
                            disabled={uploading}
                        />
                        <label htmlFor="bannerFile" className="upload-btn">
                            {uploading ? '⏳ Uploading...' : formData.banner ? '✓ Uploaded' : '📤 Upload Banner'}
                        </label>
                        {formData.banner && <div className="upload-filename">{formData.banner}</div>}
                    </div>
                    {validationErrors.banner && <span className="error">{validationErrors.banner}</span>}
                </div>

                {/* Description Upload */}
                <div className="form-group">
                    <label>Description *</label>
                    <div className="upload-section">
                        <input
                            type="file"
                            id="descriptionFile"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'description')}
                            accept=".pdf"
                            disabled={uploading}
                        />
                        <label htmlFor="descriptionFile" className="upload-btn">
                            {uploading ? '⏳ Uploading...' : formData.description ? '✓ Uploaded' : '📤 Upload Description'}
                        </label>
                        {formData.description && <div className="upload-filename">{formData.description}</div>}
                    </div>
                    {validationErrors.description && <span className="error">{validationErrors.description}</span>}
                </div>

                {/* Dates and other fields... */}
                {/* (Keep existing date fields as before) */}

                <button type="submit" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Application'}
                </button>
            </form>
        </div>
    )
}

// Helper functions (add at top of file)
const getTalukaOptions = (postedTaluka) => {
    return Array.isArray(postedTaluka) ? postedTaluka : []
}

const getGramPanchayatOptions = (anganwadiList, selectedTaluka) => {
    if (!selectedTaluka || !Array.isArray(anganwadiList)) return []
    const filtered = anganwadiList.filter(item => item.taluka === selectedTaluka)
    const gramPanchayats = [...new Set(filtered.map(item => item.gramPanchayat))]
    return gramPanchayats.sort()
}

const getAnganwadiOptions = (anganwadiList, selectedTaluka, selectedGramPanchayats) => {
    if (!selectedTaluka || !Array.isArray(anganwadiList) || !Array.isArray(selectedGramPanchayats)) return []
    const filtered = anganwadiList.filter(item =>
        item.taluka === selectedTaluka && selectedGramPanchayats.includes(item.gramPanchayat)
    )
    const anganwadis = [...new Set(filtered.map(item => item.name))]
    return anganwadis.sort()
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

export default CreateApplication
