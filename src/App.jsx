import {Navigate, Route, Routes, useNavigate} from 'react-router-dom'
import {useEffect, useRef, useState} from 'react'
import TopBar from './components/TopBar'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import CreateApplication from './pages/CreateApplication'
import ViewApplication from './pages/ViewApplication'
import Profile from './pages/StaffProfile.jsx'
import Applicants from './pages/Applicants'
import EditApplication from './pages/EditApplication'
import ApplicantDetail from './pages/ApplicantDetail'
import PublishMerit from './pages/PublishMerit'
import ApplicantHistory from './pages/ApplicantHistory'
import './App.css'

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [userEmail, setUserEmail] = useState(null)
    const navigate = useNavigate()
    const inactivityTimerRef = useRef(null)
    const refreshTimerRef = useRef(null)

    useEffect(() => {
        const lastActivityString = localStorage.getItem('staffLastActivity');
        if (!lastActivityString) {
            handleLogout(true);
            return;
        }

        const lastActivity = new Date(lastActivityString);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

        if (lastActivity < fifteenMinutesAgo) {
            handleLogout(true);
            return;
        }

        const token = localStorage.getItem('staffAccessToken');
        const email = localStorage.getItem('staffUserEmail');

        if (token && email) {
            setIsAuthenticated(true);
            setUserEmail(email);
            startActivityMonitoring();
        } else {
            handleLogout(true);
        }

        let lastRefreshString = localStorage.getItem('staffLastRefresh');
        if (!lastRefreshString) {
            localStorage.setItem('staffLastRefresh', new Date().toISOString());
            lastRefreshString = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        }

        const lastRefresh = new Date(lastRefreshString);
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        return startTokenRefresh(lastRefresh < twoMinutesAgo);
    }, []);


    // Monitor user activity
    const resetActivityTimer = () => {
        // Retrieve the last activity time from localStorage
        localStorage.setItem('staffLastActivity', new Date().toISOString());

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }

        inactivityTimerRef.current = setTimeout(() => {
            handleLogout(true)
        }, 15 * 60 * 1000) // 15 minutes
    }

    const startActivityMonitoring = () => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

        events.forEach(event => {
            document.addEventListener(event, resetActivityTimer)
        })

        resetActivityTimer()

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, resetActivityTimer)
            })
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current)
            }
        }
    }

    // Auto-refresh token every 5 minutes
    const startTokenRefresh = (hitApiImmediately = false) => {
        const refreshToken = async () => {
            try {
                const response = await fetch('https://api.gramsamruddhi.in/auth/refresh/zp-staff', {
                    method: 'POST',
                    credentials: 'include'
                });

                const data = await response.json();

                if (data.accessToken) {
                    localStorage.setItem('staffLastActivity', new Date().toISOString());
                    localStorage.setItem('staffAccessToken', data.accessToken);
                    localStorage.setItem('staffUserEmail', data.user);
                    localStorage.setItem('staffLastRefresh', new Date().toISOString());
                    if (data.meta)
                        localStorage.setItem('staffUserInfo', JSON.stringify(data.meta));
                } else {
                    handleLogout(false);
                }
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        }

        if (hitApiImmediately) {
            refreshToken();
        }

        if (!refreshTimerRef.current) {
            refreshTimerRef.current = setInterval(refreshToken, 5 * 60 * 1000);
        }

        return () => {
            if (refreshTimerRef.current) {
                clearInterval(refreshTimerRef.current);
            }
        }
    }


    const handleLogin = (email, accessToken) => {
        localStorage.setItem('staffAccessToken', accessToken)
        localStorage.setItem('staffUserEmail', email)
        setIsAuthenticated(true)
        setUserEmail(email)
        startActivityMonitoring()
        startTokenRefresh()
        navigate('/zp-staff/dashboard')
    }

    const handleLogout = async (callApi = true) => {
        if (callApi) {
            try {
                await fetch('https://api.gramsamruddhi.in/auth/logout/zp-staff', {
                    method: 'POST',
                    credentials: 'include'
                })
            } catch (error) {
                console.error('Logout API error:', error)
            }
        }
        localStorage.clear()
        setIsAuthenticated(false)
        setUserEmail(null)

        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current)
        }
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current)
        }

        navigate('/zp-staff')
    }

    const getInactivityTime = () => {
        const lastActivityString = localStorage.getItem('staffLastActivity');
        if (isAuthenticated && !lastActivityString) {
            handleLogout(true)
            return true
        }
        const lastActivityDate = new Date(lastActivityString);

        return Date.now() - lastActivityDate
    }

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
                            isAuthenticated ?
                                <Navigate to="/zp-staff/dashboard" replace/> :
                                <LoginPage onLogin={handleLogin}/>
                        }
                    />
                    <Route
                        path="/zp-staff/dashboard"
                        element={
                            isAuthenticated ?
                                <Dashboard/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />
                    <Route
                        path="/zp-staff/create-application"
                        element={
                            isAuthenticated ?
                                <CreateApplication/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />
                    <Route
                        path="/zp-staff/view-application"
                        element={
                            isAuthenticated ?
                                <ViewApplication/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />
                    <Route
                        path="/zp-staff/profile"
                        element={
                            isAuthenticated ?
                                <Profile/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />
                    <Route
                        path="/zp-staff/:applicationId/applicants"
                        element={
                            isAuthenticated ?
                                <Applicants/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />
                    <Route
                        path="/zp-staff/:applicationId/edit"
                        element={
                            isAuthenticated ?
                                <EditApplication/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />

                    <Route
                        path="/zp-staff/:applicationId/applicants/:applicantId"
                        element={
                            isAuthenticated ?
                                <ApplicantDetail/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />

                    <Route
                        path="/zp-staff/:applicationId/publish-merit"
                        element={
                            isAuthenticated ?
                                <PublishMerit/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />

                    <Route
                        path="/zp-staff/:applicationId/applicants/:applicantId/history"
                        element={
                            isAuthenticated ?
                                <ApplicantHistory/> :
                                <Navigate to="/zp-staff" replace/>
                        }
                    />


                    <Route path="/" element={<Navigate to="/zp-staff" replace/>}/>
                </Routes>
            </main>
        </div>
    )
}

export default App
