const INPUT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const API_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T/

const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

const parseInputDate = (dateValue) => {
    if (!dateValue) {
        return ''
    }

    return String(dateValue).trim()
}

// Backend timestamps are UTC (e.g. "2026-07-15T18:30:00Z" == midnight IST the next day),
// so the date part must be derived after converting to India time, not by slicing the string.
const toIstDateInputString = (isoDateTime) => {
    const date = new Date(isoDateTime)

    if (Number.isNaN(date.getTime())) {
        return isoDateTime
    }

    return IST_DATE_FORMATTER.format(date)
}

export const convertDateToApi = (dateValue) => {
    const value = parseInputDate(dateValue)

    if (!value) {
        return ''
    }

    const normalizedValue = ISO_DATETIME_PATTERN.test(value) ? toIstDateInputString(value) : value

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

    if (ISO_DATETIME_PATTERN.test(value)) {
        return toIstDateInputString(value)
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
