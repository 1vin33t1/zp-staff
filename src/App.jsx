import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import TopBar from './components/TopBar'
import { useStaffSession } from './hooks/useStaffSession'
import ApplicantDetail from './pages/ApplicantDetail'
import ApplicantHistory from './pages/ApplicantHistory'
import Applicants from './pages/Applicants'
import CreateApplication from './pages/CreateApplication'
import Dashboard from './pages/Dashboard'
import EditApplication from './pages/EditApplication'
import LoginPage from './pages/LoginPage'
import Profile from './pages/StaffProfile.jsx'
import PublishMerit from './pages/PublishMerit'
import ViewApplication from './pages/ViewApplication'
import './App.css'

function App() {
    const {
        getInactivityTime,
        handleLogin,
        handleLogout,
        isAuthenticated,
        userEmail,
    } = useStaffSession()

    const protectedRoutes = [
        { path: '/zp-staff/dashboard', element: <Dashboard /> },
        { path: '/zp-staff/create-application', element: <CreateApplication /> },
        { path: '/zp-staff/view-application', element: <ViewApplication /> },
        { path: '/zp-staff/profile', element: <Profile /> },
        { path: '/zp-staff/:applicationId/applicants', element: <Applicants /> },
        { path: '/zp-staff/:applicationId/edit', element: <EditApplication /> },
        { path: '/zp-staff/:applicationId/applicants/:applicantId', element: <ApplicantDetail /> },
        { path: '/zp-staff/:applicationId/publish-merit', element: <PublishMerit /> },
        { path: '/zp-staff/:applicationId/applicants/:applicantId/history', element: <ApplicantHistory /> },
    ]

    return (
        <div className="app">
            <TopBar
                isAuthenticated={isAuthenticated}
                userEmail={userEmail}
                onLogout={() => handleLogout(true)}
                getInactivityTime={getInactivityTime}
            />
            <main className="main-content">
                <Routes>
                    <Route
                        path="/zp-staff"
                        element={
                            isAuthenticated
                                ? <Navigate to="/zp-staff/dashboard" replace />
                                : <LoginPage onLogin={handleLogin} />
                        }
                    />
                    {protectedRoutes.map((route) => (
                        <Route
                            key={route.path}
                            path={route.path}
                            element={
                                <ProtectedRoute isAuthenticated={isAuthenticated}>
                                    {route.element}
                                </ProtectedRoute>
                            }
                        />
                    ))}
                    <Route path="/" element={<Navigate to="/zp-staff" replace />} />
                </Routes>
            </main>
        </div>
    )
}

export default App
