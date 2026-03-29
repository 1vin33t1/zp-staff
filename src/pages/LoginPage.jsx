import React, { useEffect, useRef, useState } from 'react'
import { fetchJson } from '../lib/api'
import { setStaffLastActivity, setStaffLastRefresh, setStaffUserInfo } from '../lib/authStorage'
import './LoginPage.css'

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', ''])
    const [step, setStep] = useState('email') // 'email', 'otp'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [emailError, setEmailError] = useState('')
    const canVerifyRef = useRef(false)

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
                const waitTime = Math.max(0, Math.floor((data.nextAttemptAt - Date.now()) / 1000))
                setCountdown(waitTime)
            } else {
                setError(data.failureReason || 'Failed to send OTP')
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const verifyOTP = async () => {
        const otpValue = otp.join('')
        if (otpValue.length !== 4) {
            setError('Please enter complete OTP')
            return
        }

        if (!canVerifyRef.current) {
            return
        }
        canVerifyRef.current = false

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
                onLogin(email, data.accessToken)
            } else {
                setError(data.failureReason || 'Invalid OTP')
                setOtp(['', '', '', ''])
                canVerifyRef.current = false
                document.getElementById('otp-0')?.focus()
            }
        } catch (err) {
            setError('Network error. Please try again.')
            canVerifyRef.current = false
        } finally {
            setLoading(false)
        }
    }

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
        const completeOtp = otp.join('');

        if (completeOtp.length === 4 && otp.every(d => d !== '')) {
            canVerifyRef.current = true;
            setTimeout(() => {
                verifyOTP()
            }, 200)
        } else {
            canVerifyRef.current = false;
        }
    }, [otp]);

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`)?.focus()
        }
    }

    const handleOtpPaste = (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').trim()
        if (/^[0-9]{4}$/.test(pastedData)) {
            const newOtp = pastedData.split('')
            setOtp(newOtp)
            setError('')
            document.getElementById('otp-3')?.focus()

            canVerifyRef.current = true
            setTimeout(() => {
                verifyOTP()
            }, 200)
        }
    }

    const resendOTP = () => {
        setOtp(['', '', '', ''])
        setError('')
        canVerifyRef.current = false
        sendOTP()
    }

    const changeEmail = () => {
        setStep('email')
        setOtp(['', '', '', ''])
        setError('')
        setEmailError('')
        canVerifyRef.current = false
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
