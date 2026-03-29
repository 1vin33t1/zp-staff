import React from 'react'
import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ isAuthenticated, children }) => {
    if (!isAuthenticated) {
        return <Navigate to="/zp-staff" replace />
    }

    return children
}

export default ProtectedRoute
