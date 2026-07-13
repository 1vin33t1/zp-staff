import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchJson } from '../lib/api'
import {
    getStaffPendingRedirect,
    setStaffLastActivity,
    setStaffLastRefresh,
    setStaffUserInfo,
} from '../lib/authStorage'
import './LoginPage.css'

const LoginPage = ({ onLogin }) => {
    const location = useLocation()
    const redirectRef = useRef(null)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', ''])
    const [step, setStep] = useState('email') // 'email', 'otp'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [emailError, setEmailError] = useState('')
    const verifyInFlightRef = useRef(false)

    if (!redirectRef.current) {
        const queryRedirect = new URLSearchParams(location.search).get('redirect')
        const isSafeRedirect = (path) => typeof path === 'string' && path.startsWith('/zp-staff')
        redirectRef.current = [location.state?.redirectTo, queryRedirect, getStaffPendingRedirect()]
            .find(isSafeRedirect)
            || '/zp-staff/dashboard'
    }

    // Countdown timer for resend OTP
    useEffect(() => {
        let timer
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1)
            }, 1000)
        }
        return () => clearInterval(timer)
    }, [countdown])

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    const handleEmailChange = (value) => {
        setEmail(value)
        setEmailError('')
        setError('')
    }

    const sendOTP = async () => {
        if (!email.trim()) {
            setEmailError('Please enter your email address')
            return
        }

        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address')
            return
        }

        setLoading(true)
        setError('')
        setEmailError('')

        try {
            const data = await fetchJson(`/auth/send-otp?role=ZP_STAFF&email=${encodeURIComponent(email)}`, {
                method: 'POST'
            })

            if (data.success) {
                setStep('otp')
                const nextAttemptAt = Number(data.nextAttemptAt)
                const waitTime = Number.isFinite(nextAttemptAt)
                    ? Math.max(0, Math.ceil((nextAttemptAt - Date.now()) / 1000))
                    : 0
                setCountdown(waitTime)
            } else {
                setError(data.failureReason || 'Failed to send OTP')
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const verifyOTP = useCallback(async () => {
        const otpValue = otp.join('')
        if (otpValue.length !== 4) {
            setError('Please enter complete OTP')
            return
        }

        if (verifyInFlightRef.current) {
            return
        }
        verifyInFlightRef.current = true

        setLoading(true)
        setError('')

        try {
            const data = await fetchJson(`/auth/verify-otp?role=ZP_STAFF&email=${encodeURIComponent(email)}&otp=${otpValue}`, {
                method: 'POST',
                credentials: 'include'
            })
            if (data.verified) {
                setStaffLastActivity()
                setStaffLastRefresh()
                if (data.meta) {
                    setStaffUserInfo(data.meta)
                }
                onLogin(email, data.accessToken, redirectRef.current)
            } else {
                setError(data.failureReason || 'Invalid OTP')
                setOtp(['', '', '', ''])
                // Defer until the inputs re-enable (loading flips in finally).
                setTimeout(() => {
                    document.getElementById('otp-0')?.focus()
                }, 0)
            }
        } catch {
            setError('Network error. Please try again.')
        } finally {
            verifyInFlightRef.current = false
            setLoading(false)
        }
    }, [email, onLogin, otp])

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return
        if (value && !/^[0-9]$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)
        setError('')

        // Auto-focus next input
        if (value && index < 3) {
            document.getElementById(`otp-${index + 1}`)?.focus()
        }

    }

    useEffect(() => {
        const completeOtp = otp.join('')

        if (completeOtp.length === 4 && otp.every(d => d !== '')) {
            const timer = setTimeout(() => {
                verifyOTP()
            }, 200)

            return () => clearTimeout(timer)
        }

        return undefined
    }, [otp, verifyOTP])

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus()
        }
    }

    const handleOtpPaste = (e) => {
        const pastedDigits = e.clipboardData.getData('text').replace(/\D/g, '')
        if (pastedDigits.length !== 4) {
            return
        }

        e.preventDefault()
        setOtp(pastedDigits.split(''))
        setError('')
        document.getElementById('otp-3')?.focus()
    }

    const resendOTP = () => {
        setOtp(['', '', '', ''])
        setError('')
        sendOTP()
    }

    const changeEmail = () => {
        setStep('email')
        setOtp(['', '', '', ''])
        setError('')
        setEmailError('')
        verifyInFlightRef.current = false
    }

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>ZP Staff Login</h2>

                {step === 'email' && (
                    <>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => handleEmailChange(e.target.value)}
                                placeholder="Enter your email address"
                                disabled={loading}
                                className={emailError ? 'input-error' : ''}
                            />
                            {emailError && <div className="field-error">{emailError}</div>}
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="primary-btn full-width"
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div className="email-display">
                            <p>OTP sent to: <strong>{email}</strong></p>
                            <button onClick={changeEmail} className="change-email-btn">
                                Change Email
                            </button>
                        </div>

                        <div className="form-group">
                            <label>Enter OTP</label>
                            <div className="otp-inputs">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        onPaste={(e) => handleOtpPaste(e)}
                                        disabled={loading}
                                        className="otp-input"
                                    />
                                ))}
                            </div>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="otp-actions">
                            <button
                                onClick={resendOTP}
                                disabled={loading || countdown > 0}
                                className="secondary-btn action-btn"
                            >
                                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                            </button>

                            <button
                                onClick={verifyOTP}
                                disabled={loading || otp.join('').length !== 4}
                                className="primary-btn action-btn"
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default LoginPage
