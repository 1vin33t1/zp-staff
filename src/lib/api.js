import { getStaffAccessToken } from './authStorage'

export const API_BASE_URL = 'https://api.gramsamruddhi.in'
export const FILES_BASE_URL = 'https://files.gramsamruddhi.in'

export const apiUrl = (path) => `${API_BASE_URL}${path}`

export const createAuthHeaders = (headers = {}) => {
    const token = getStaffAccessToken()

    if (!token) {
        return headers
    }

    return {
        ...headers,
        Authorization: `Bearer ${token}`,
    }
}

export const fetchJson = async (path, options = {}) => {
    const response = await fetch(apiUrl(path), options)
    return response.json()
}

export const uploadPublicFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    return fetchJson('/upload', {
        method: 'POST',
        headers: createAuthHeaders({
            'X-Bucket-Name': 'public',
        }),
        body: formData,
    })
}

export const toAbsoluteFileUrl = (assetPath) => {
    if (!assetPath) {
        return ''
    }

    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
        return assetPath
    }

    return `${FILES_BASE_URL}/${assetPath}`
}
