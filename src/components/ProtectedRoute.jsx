import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { setStaffPendingRedirect } from '../lib/authStorage'

const ProtectedRoute = ({ isAuthenticated, children }) => {
    const location = useLocation()
    const redirectTo = `${location.pathname}${location.search}${location.hash}`

    if (!isAuthenticated) {
        setStaffPendingRedirect(redirectTo)

        return (
            <Navigate
                to={`/zp-staff?redirect=${encodeURIComponent(redirectTo)}`}
                replace
                state={{
                    redirectTo,
                }}
            />
        )
    }

    return children
}

export default ProtectedRoute
