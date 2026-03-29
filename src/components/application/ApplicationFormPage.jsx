import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthHeaders, fetchJson, uploadPublicFile } from '../../lib/api'
import {
    convertDateToApi,
    convertDateToInput,
    getDateMinusDays,
    getTodayDate,
} from '../../lib/date'
import { naturalSort } from '../../lib/sort'
import ConfirmModal from '../ui/ConfirmModal'
import InlineMessage from '../ui/InlineMessage'
import PageLoader from '../ui/PageLoader'
import './ApplicationFormPage.css'

const FORM_COPY = {
    create: {
        pageTitle: 'Create Application',
        pageSubtitle: 'Fill in the details below to create a new application',
        successMessage: 'Application successfully created!',
        submitLabel: 'Submit',
        submittingLabel: 'Submitting...',
        confirmTitle: 'Confirm Submission',
        confirmDescription: 'Please verify all data before submitting the application. Thank you.',
        confirmActionLabel: 'Confirm Submit',
        backRoute: '/zp-staff/dashboard',
        backLabel: 'Back to Dashboard',
        successRoute: '/zp-staff/dashboard',
        submitPath: '/zp-staff/create-application',
        submitErrorMessage: 'Failed to create application. Please try again.',
        accessTitle: '❌ You have not been posted to any taluka yet.',
        accessDescription: 'To create an application, you need to be posted to at least one taluka.',
    },
    edit: {
        pageTitle: 'Edit Application',
        pageSubtitle: 'Update the application details below',
        successMessage: 'Application successfully updated!',
        submitLabel: 'Update Application',
        submittingLabel: 'Updating...',
        confirmTitle: 'Confirm Update',
        confirmDescription: 'Please verify all data before submitting the application. Thank you.',
        confirmActionLabel: 'Confirm Update',
        backRoute: '/zp-staff/view-application',
        backLabel: 'Back to Applications',
        successRoute: '/zp-staff/view-application',
        submitPath: '/zp-staff/edit-application',
        submitErrorMessage: 'Failed to update application. Please try again.',
        accessTitle: '❌ You have not been posted to application taluka.',
        accessDescription: 'To edit this application, you need to be posted to the same taluka.',
    },
}

const createInitialFormState = () => ({
    id: '',
    name: '',
    taluka: '',
    gramPanchayatList: [],
    anganwadiList: [],
    banner: '',
    description: '',
    selfDeclarationForm: '',
    startDate: '',
    endDate: '',
    publish: false,
})

const CheckboxGrid = ({ items, selectedItems, onChange }) => {
    const rows = []

    for (let index = 0; index < items.length; index += 4) {
        rows.push(items.slice(index, index + 4))
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
                                onChange={(event) => {
                                    const updatedItems = event.target.checked
                                        ? [...selectedItems, item]
                                        : selectedItems.filter((selectedItem) => selectedItem !== item)

                                    onChange(updatedItems)
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

const FileUploadField = ({
    id,
    label,
    value,
    accept,
    isUploading,
    isDisabled,
    onUpload,
}) => (
    <div className="form-field">
        <label className="form-label">
            {label} <span className="required">*</span>
        </label>
        <div className="upload-section">
            <input
                type="file"
                id={id}
                onChange={(event) => onUpload(event.target.files?.[0])}
                accept={accept}
                disabled={isUploading || isDisabled}
            />
            <label htmlFor={id} className={`upload-btn ${value ? 'uploaded' : ''}`}>
                {isUploading ? 'Uploading...' : value ? 'Uploaded' : `Upload ${label}`}
            </label>
            {value && <div className="upload-filename">{value}</div>}
        </div>
    </div>
)

const getTalukaOptions = (postedTaluka) => {
    return Array.isArray(postedTaluka) ? postedTaluka : []
}

const getGramPanchayatOptions = (anganwadiList, selectedTaluka) => {
    if (!selectedTaluka || !Array.isArray(anganwadiList)) {
        return []
    }

    const filteredList = anganwadiList.filter((item) => item.taluka === selectedTaluka)
    const gramPanchayats = [...new Set(filteredList.map((item) => item.gramPanchayat))]

    return gramPanchayats.sort(naturalSort)
}

const getAnganwadiOptions = (anganwadiList, selectedTaluka, selectedGramPanchayats) => {
    if (!selectedTaluka || !Array.isArray(anganwadiList) || !Array.isArray(selectedGramPanchayats)) {
        return []
    }

    const filteredList = anganwadiList.filter((item) => (
        item.taluka === selectedTaluka && selectedGramPanchayats.includes(item.gramPanchayat)
    ))
    const anganwadis = [...new Set(filteredList.map((item) => item.name))]

    return anganwadis.sort(naturalSort)
}

const ApplicationFormPage = ({ mode, applicationId = null }) => {
    const navigate = useNavigate()
    const copy = FORM_COPY[mode]
    const isEditMode = mode === 'edit'

    const [eligibilityData, setEligibilityData] = useState({
        anganwadiList: [],
        postedTaluka: [],
    })
    const [formData, setFormData] = useState(createInitialFormState)
    const [validationErrors, setValidationErrors] = useState({})
    const [loadingEligibility, setLoadingEligibility] = useState(true)
    const [loadingApplication, setLoadingApplication] = useState(isEditMode)
    const [errorBreaking, setErrorBreaking] = useState('')
    const [errorRetry, setErrorRetry] = useState('')
    const [uploadingFields, setUploadingFields] = useState({
        banner: false,
        description: false,
        selfDeclarationForm: false,
    })
    const [submitting, setSubmitting] = useState(false)
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)

    useEffect(() => {
        let isActive = true

        const loadEligibilityData = async () => {
            try {
                const data = await fetchJson('/zp-staff/eligibility', {
                    method: 'GET',
                    headers: createAuthHeaders(),
                })

                if (!data.result || !data.data) {
                    throw new Error('Invalid response')
                }

                if (!isActive) {
                    return
                }

                const nextEligibilityData = {
                    anganwadiList: data.data.anganwadiList || [],
                    postedTaluka: data.data.postedTaluka || [],
                }

                setEligibilityData(nextEligibilityData)

                if (!isEditMode && nextEligibilityData.postedTaluka.length === 1) {
                    const [onlyTaluka] = nextEligibilityData.postedTaluka

                    setFormData((previousValue) => ({
                        ...previousValue,
                        taluka: onlyTaluka,
                        gramPanchayatList: [],
                        anganwadiList: [],
                    }))
                }
            } catch (error) {
                if (isActive) {
                    setErrorBreaking('Failed to load eligibility data. Please try again.')
                }
            } finally {
                if (isActive) {
                    setLoadingEligibility(false)
                }
            }
        }

        const loadApplicationData = async () => {
            if (!isEditMode || !applicationId) {
                if (isActive) {
                    setLoadingApplication(false)
                }
                return
            }

            try {
                const data = await fetchJson(`/zp-staff/${applicationId}/edit-application`, {
                    method: 'GET',
                    headers: createAuthHeaders(),
                })

                if (!data.result || !data.data) {
                    throw new Error('Invalid response format')
                }

                if (!isActive) {
                    return
                }

                const applicationData = data.data
                setFormData({
                    id: applicationData.id || '',
                    name: applicationData.name || '',
                    taluka: applicationData.taluka || '',
                    gramPanchayatList: applicationData.gramPanchayatList || [],
                    anganwadiList: applicationData.anganwadiList || [],
                    banner: applicationData.banner || '',
                    description: applicationData.description || '',
                    selfDeclarationForm: applicationData.selfDeclarationForm || '',
                    startDate: convertDateToInput(applicationData.startDate) || '',
                    endDate: convertDateToInput(applicationData.endDate) || '',
                    publish: applicationData.publish || false,
                })
            } catch (error) {
                if (isActive) {
                    setErrorBreaking('Failed to load application data. Please try again.')
                }
            } finally {
                if (isActive) {
                    setLoadingApplication(false)
                }
            }
        }

        loadEligibilityData()
        loadApplicationData()

        return () => {
            isActive = false
        }
    }, [applicationId, isEditMode])

    const talukaOptions = getTalukaOptions(eligibilityData.postedTaluka)
    const gramPanchayatOptions = getGramPanchayatOptions(eligibilityData.anganwadiList, formData.taluka)
    const anganwadiOptions = getAnganwadiOptions(
        eligibilityData.anganwadiList,
        formData.taluka,
        formData.gramPanchayatList,
    )

    const isLoading = loadingEligibility || loadingApplication
    const isAccessAllowed = isEditMode
        ? eligibilityData.postedTaluka.includes(formData.taluka)
        : talukaOptions.length > 0

    const clearFieldError = (fieldName) => {
        if (!validationErrors[fieldName]) {
            return
        }

        setValidationErrors((previousValue) => ({
            ...previousValue,
            [fieldName]: '',
        }))
    }

    const handleTalukaChange = (event) => {
        const selectedTaluka = event.target.value

        setFormData((previousValue) => ({
            ...previousValue,
            taluka: selectedTaluka,
            gramPanchayatList: [],
            anganwadiList: [],
        }))
        clearFieldError('taluka')
    }

    const handleGramPanchayatChange = (updatedItems) => {
        setFormData((previousValue) => ({
            ...previousValue,
            gramPanchayatList: updatedItems,
            anganwadiList: [],
        }))
        clearFieldError('gramPanchayatList')
    }

    const handleAnganwadiChange = (updatedItems) => {
        setFormData((previousValue) => ({
            ...previousValue,
            anganwadiList: updatedItems,
        }))
        clearFieldError('anganwadiList')
    }

    const handleInputChange = (field, value) => {
        setFormData((previousValue) => ({
            ...previousValue,
            [field]: value,
        }))
        clearFieldError(field)
        setErrorRetry('')
    }

    const validateDates = () => {
        if (!formData.startDate || !formData.endDate) {
            return true
        }

        return new Date(formData.endDate) > new Date(formData.startDate)
    }

    const validateForm = () => {
        const errors = {}

        if (!formData.name.trim()) {
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

        if (!formData.selfDeclarationForm) {
            errors.selfDeclarationForm = 'Self declaration form is required'
        }

        if (!formData.startDate) {
            errors.startDate = 'Start date is required'
        }

        if (!formData.endDate) {
            errors.endDate = 'End date is required'
        }

        if (formData.startDate && formData.endDate && !validateDates()) {
            errors.endDate = 'End date must be greater than start date'
        }

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    const areMandatoryFieldsFilled = () => (
        formData.name.trim() !== ''
        && formData.taluka !== ''
        && formData.gramPanchayatList.length > 0
        && formData.anganwadiList.length > 0
        && formData.banner !== ''
        && formData.description !== ''
        && formData.selfDeclarationForm !== ''
        && formData.startDate !== ''
        && formData.endDate !== ''
    )

    const handleSubmitClick = () => {
        if (!areMandatoryFieldsFilled()) {
            setErrorRetry('Please fill all mandatory fields before submitting')
            return
        }

        if (!validateDates()) {
            setValidationErrors((previousValue) => ({
                ...previousValue,
                endDate: 'End date must be greater than start date',
            }))
            return
        }

        setShowDisclaimer(true)
    }

    const handleFileUpload = async (field, file) => {
        if (!file) {
            return
        }

        setUploadingFields((previousValue) => ({
            ...previousValue,
            [field]: true,
        }))
        setErrorRetry('')

        try {
            const data = await uploadPublicFile(file)

            if (!data.result || !data.data) {
                throw new Error('Upload failed')
            }

            handleInputChange(field, data.data)
        } catch (error) {
            setErrorRetry(`Failed to upload ${field}. Please try again.`)
        } finally {
            setUploadingFields((previousValue) => ({
                ...previousValue,
                [field]: false,
            }))
        }
    }

    const handleConfirmSubmit = async () => {
        if (!validateForm()) {
            return
        }

        setShowDisclaimer(false)
        setSubmitting(true)
        setErrorRetry('')

        const payload = {
            name: formData.name,
            taluka: formData.taluka,
            gramPanchayatList: formData.gramPanchayatList,
            anganwadiList: formData.anganwadiList,
            banner: formData.banner,
            description: formData.description,
            selfDeclarationForm: formData.selfDeclarationForm,
            startDate: convertDateToApi(formData.startDate),
            endDate: convertDateToApi(formData.endDate),
            publish: formData.publish,
        }

        if (isEditMode) {
            payload.id = formData.id
        }

        try {
            const data = await fetchJson(copy.submitPath, {
                method: 'POST',
                headers: createAuthHeaders({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify(payload),
            })

            if (!data.result || data.data !== 'success') {
                throw new Error('Submission failed')
            }

            setSubmitSuccess(true)
            setTimeout(() => {
                navigate(copy.successRoute)
            }, 2000)
        } catch (error) {
            setErrorRetry(copy.submitErrorMessage)
            setSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <PageLoader message="Loading application data..." />
                </div>
            </div>
        )
    }

    if (errorBreaking) {
        return (
            <div className="page-container">
                <div className="page-content">
                    <div className="page-header">
                        <h1>{copy.pageTitle}</h1>
                        <p>{copy.pageSubtitle}</p>
                    </div>
                <InlineMessage>{errorBreaking}</InlineMessage>
                </div>
            </div>
        )
    }

    if (!isAccessAllowed) {
        return (
            <div className="error-box">
                <p>{copy.accessTitle}</p>
                <p>{copy.accessDescription}</p>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="page-content">
                <div className="page-header">
                    <h1>{copy.pageTitle}</h1>
                    <p>{copy.pageSubtitle}</p>
                </div>

                {submitSuccess && (
                    <InlineMessage variant="success">{copy.successMessage}</InlineMessage>
                )}
                <div className="form-container">
                    <div className="form-field">
                        <label htmlFor="name">Name of Application <span className="required">*</span></label>
                        <input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(event) => handleInputChange('name', event.target.value)}
                            placeholder="Enter application name"
                            disabled={submitting}
                        />
                        {validationErrors.name && <span className="error">{validationErrors.name}</span>}
                    </div>

                    <div className="form-field">
                        <label>Taluka <span className="required">*</span></label>
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
                                {talukaOptions.map((taluka) => (
                                    <option key={taluka} value={taluka}>
                                        {taluka}
                                    </option>
                                ))}
                            </select>
                        )}
                        {validationErrors.taluka && <span className="error">{validationErrors.taluka}</span>}
                    </div>

                    {formData.taluka && (
                        <div className="form-field">
                            <label>Gram Panchayat <span className="required">*</span> ({formData.gramPanchayatList.length} selected)</label>
                            {gramPanchayatOptions.length > 0 ? (
                                <CheckboxGrid
                                    items={gramPanchayatOptions}
                                    selectedItems={formData.gramPanchayatList}
                                    onChange={handleGramPanchayatChange}
                                />
                            ) : (
                                <p className="no-options">No Gram Panchayats available for selected Taluka</p>
                            )}
                            {validationErrors.gramPanchayatList && (
                                <span className="error">{validationErrors.gramPanchayatList}</span>
                            )}
                        </div>
                    )}

                    {formData.gramPanchayatList.length > 0 && (
                        <div className="form-field">
                            <label>Anganwadi <span className="required">*</span> ({formData.anganwadiList.length} selected)</label>
                            {anganwadiOptions.length > 0 ? (
                                <CheckboxGrid
                                    items={anganwadiOptions}
                                    selectedItems={formData.anganwadiList}
                                    onChange={handleAnganwadiChange}
                                />
                            ) : (
                                <p className="no-options">No Anganwadis available for selected options</p>
                            )}
                            {validationErrors.anganwadiList && (
                                <span className="error">{validationErrors.anganwadiList}</span>
                            )}
                        </div>
                    )}

                    <FileUploadField
                        id={`${mode}-banner-file`}
                        label="Banner"
                        value={formData.banner}
                        isUploading={uploadingFields.banner}
                        isDisabled={submitting}
                        onUpload={(file) => handleFileUpload('banner', file)}
                    />
                    {validationErrors.banner && <span className="error">{validationErrors.banner}</span>}

                    <FileUploadField
                        id={`${mode}-description-file`}
                        label="Description"
                        value={formData.description}
                        accept=".pdf"
                        isUploading={uploadingFields.description}
                        isDisabled={submitting}
                        onUpload={(file) => handleFileUpload('description', file)}
                    />
                    {validationErrors.description && <span className="error">{validationErrors.description}</span>}

                    <FileUploadField
                        id={`${mode}-self-declaration-file`}
                        label="Self Declaration Form"
                        value={formData.selfDeclarationForm}
                        accept=".pdf"
                        isUploading={uploadingFields.selfDeclarationForm}
                        isDisabled={submitting}
                        onUpload={(file) => handleFileUpload('selfDeclarationForm', file)}
                    />
                    {validationErrors.selfDeclarationForm && (
                        <span className="error">{validationErrors.selfDeclarationForm}</span>
                    )}

                    <div className="form-field">
                        <label htmlFor="startDate">Start Date <span className="required">*</span></label>
                        <input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            min={getDateMinusDays(60)}
                            onChange={(event) => handleInputChange('startDate', event.target.value)}
                            disabled={submitting}
                        />
                        {validationErrors.startDate && <span className="error">{validationErrors.startDate}</span>}
                    </div>

                    <div className="form-field">
                        <label htmlFor="endDate">End Date <span className="required">*</span></label>
                        <input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            min={formData.startDate || getTodayDate()}
                            onChange={(event) => handleInputChange('endDate', event.target.value)}
                            disabled={submitting}
                        />
                        {validationErrors.endDate && <span className="error">{validationErrors.endDate}</span>}
                    </div>

                    <div className="form-field checkbox-field">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.publish}
                                onChange={(event) => handleInputChange('publish', event.target.checked)}
                                disabled={submitting}
                            />
                            <span>Publish on HomePage</span>
                        </label>
                    </div>

                    <InlineMessage>{errorRetry}</InlineMessage>

                    <div className="form-actions">
                        <button
                            className="secondary-btn"
                            onClick={() => navigate(copy.backRoute)}
                            disabled={submitting}
                        >
                            {copy.backLabel}
                        </button>

                        <button
                            className="primary-btn"
                            onClick={handleSubmitClick}
                            disabled={submitting}
                        >
                            {submitting ? copy.submittingLabel : copy.submitLabel}
                        </button>
                    </div>
                </div>

                <ConfirmModal
                    isOpen={showDisclaimer}
                    title={copy.confirmTitle}
                    description={copy.confirmDescription}
                    confirmLabel={copy.confirmActionLabel}
                    onCancel={() => setShowDisclaimer(false)}
                    onConfirm={handleConfirmSubmit}
                />
            </div>
        </div>
    )
}

export default ApplicationFormPage
