const INPUT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const API_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/
const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})T/

const parseInputDate = (dateValue) => {
    if (!dateValue) {
        return ''
    }

    return String(dateValue).trim()
}

export const convertDateToApi = (dateValue) => {
    const value = parseInputDate(dateValue)

    if (!value) {
        return ''
    }

    const isoMatch = value.match(ISO_DATE_PREFIX_PATTERN)
    const normalizedValue = isoMatch ? isoMatch[1] : value

    if (INPUT_DATE_PATTERN.test(normalizedValue)) {
        const [year, month, day] = normalizedValue.split('-')
        return `${day}-${month}-${year}`
    }

    return value
}

export const convertDateToInput = (dateValue) => {
    const value = parseInputDate(dateValue)

    if (!value) {
        return ''
    }

    const isoMatch = value.match(ISO_DATE_PREFIX_PATTERN)
    if (isoMatch) {
        return isoMatch[1]
    }

    if (INPUT_DATE_PATTERN.test(value)) {
        return value
    }

    if (API_DATE_PATTERN.test(value)) {
        const [day, month, year] = value.split('-')
        return `${year}-${month}-${day}`
    }

    return value
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

    const inputDate = convertDateToInput(dateValue)
    const date = INPUT_DATE_PATTERN.test(inputDate)
        ? new Date(...inputDate.split('-').map((part, index) => (
            index === 1 ? Number(part) - 1 : Number(part)
        )))
        : new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
        return String(dateValue)
    }

    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}
