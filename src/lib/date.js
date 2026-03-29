export const convertDateToApi = (dateValue) => {
    if (!dateValue) {
        return ''
    }

    const parts = dateValue.split('-')
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`
    }

    return dateValue
}

export const convertDateToInput = (dateValue) => {
    if (!dateValue) {
        return ''
    }

    const parts = dateValue.split('-')
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`
    }

    return dateValue
}

export const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export const getDateMinusDays = (days) => {
    const date = new Date()
    date.setDate(date.getDate() - days)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export const formatDateDisplay = (dateValue, locale = 'en-IN') => {
    if (!dateValue) {
        return ''
    }

    return new Date(dateValue).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}
