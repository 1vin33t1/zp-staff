import React from 'react'
import { useParams } from 'react-router-dom'
import ApplicationFormPage from '../components/application/ApplicationFormPage'

const EditApplication = () => {
    const { applicationId } = useParams()

    return <ApplicationFormPage mode="edit" applicationId={applicationId} />
}

export default EditApplication
