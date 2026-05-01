const STAFF_STORAGE_KEYS = {
    accessToken: 'staffAccessToken',
    userEmail: 'staffUserEmail',
    lastActivity: 'staffLastActivity',
    lastRefresh: 'staffLastRefresh',
    userInfo: 'staffUserInfo',
    pendingRedirect: 'staffPendingRedirect',
}

const setStorageValue = (key, value) => {
    if (value === null || value === undefined || value === '') {
        localStorage.removeItem(key)
        return
    }

    localStorage.setItem(key, value)
}

export const getStaffAccessToken = () => localStorage.getItem(STAFF_STORAGE_KEYS.accessToken)

export const setStaffAccessToken = (accessToken) => {
    setStorageValue(STAFF_STORAGE_KEYS.accessToken, accessToken)
}

export const getStaffUserEmail = () => localStorage.getItem(STAFF_STORAGE_KEYS.userEmail)

export const setStaffUserEmail = (userEmail) => {
    setStorageValue(STAFF_STORAGE_KEYS.userEmail, userEmail)
}

export const getStaffLastActivity = () => localStorage.getItem(STAFF_STORAGE_KEYS.lastActivity)

export const setStaffLastActivity = (value = new Date().toISOString()) => {
    setStorageValue(STAFF_STORAGE_KEYS.lastActivity, value)
}

export const getStaffLastRefresh = () => localStorage.getItem(STAFF_STORAGE_KEYS.lastRefresh)

export const setStaffLastRefresh = (value = new Date().toISOString()) => {
    setStorageValue(STAFF_STORAGE_KEYS.lastRefresh, value)
}

export const getStaffUserInfo = () => {
    const rawValue = localStorage.getItem(STAFF_STORAGE_KEYS.userInfo)
    if (!rawValue) {
        return null
    }

    try {
        return JSON.parse(rawValue)
    } catch {
        return null
    }
}

export const setStaffUserInfo = (userInfo) => {
    if (!userInfo) {
        localStorage.removeItem(STAFF_STORAGE_KEYS.userInfo)
        return
    }

    localStorage.setItem(STAFF_STORAGE_KEYS.userInfo, JSON.stringify(userInfo))
}

export const getStaffPendingRedirect = () => localStorage.getItem(STAFF_STORAGE_KEYS.pendingRedirect)

export const setStaffPendingRedirect = (redirectPath) => {
    if (!redirectPath || !redirectPath.startsWith('/zp-staff') || redirectPath === '/zp-staff') {
        return
    }

    setStorageValue(STAFF_STORAGE_KEYS.pendingRedirect, redirectPath)
}

export const clearStaffPendingRedirect = () => {
    localStorage.removeItem(STAFF_STORAGE_KEYS.pendingRedirect)
}

export const clearStaffSession = () => {
    localStorage.removeItem(STAFF_STORAGE_KEYS.accessToken)
    localStorage.removeItem(STAFF_STORAGE_KEYS.userEmail)
    localStorage.removeItem(STAFF_STORAGE_KEYS.lastActivity)
    localStorage.removeItem(STAFF_STORAGE_KEYS.lastRefresh)
    localStorage.removeItem(STAFF_STORAGE_KEYS.userInfo)
}

export { STAFF_STORAGE_KEYS }
