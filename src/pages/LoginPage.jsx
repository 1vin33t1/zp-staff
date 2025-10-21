import React, { useState, useEffect } from 'react'
import './LoginPage.css'

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', ''])
    const [step, setStep] = useState('email') // 'email', 'otp'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)

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

    const sendOTP = async () => {
        if (!email.trim()) {
            setError('Please enter your email address')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await fetch(`https://api.pranvidyatech.in/auth/send-otp?role=ZP_STAFF&email=${encodeURIComponent(email)}`, {
                method: 'POST'
            })

            const data = await response.json()

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

        setLoading(true)
        setError('')

        try {
            const response = await fetch(`https://api.pranvidyatech.in/auth/verify-otp?role=ZP_STAFF&email=${encodeURIComponent(email)}&otp=${otpValue}`, {
                method: 'POST'
            })

            const data = await response.json()

            if (data.verified) {
                onLogin(email, data.accessToken)
            } else {
                setError(data.failureReason || 'Invalid OTP')
                setOtp(['', '', '', '']) // Clear OTP fields
            }
        } catch (err) {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 3) {
            document.getElementById(`otp-${index + 1}`).focus()
        }

        // Auto-verify when all 4 digits are entered
        const completeOtp = newOtp.join('')
        if (completeOtp.length === 4) {
            setTimeout(verifyOTP, 100)
        }
    }

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus()
        }
    }

    const resendOTP = () => {
        setOtp(['', '', '', ''])
        setError('')
        sendOTP()
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
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                disabled={loading}
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button
                            onClick={sendOTP}
                            disabled={loading}
                            className="primary-btn"
                        >
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div className="email-display">
                            <p>OTP sent to: <strong>{email}</strong></p>
                        </div>

                        <div className="form-group">
                            <label>Enter OTP</label>
                            <div className="otp-inputs">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
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
                                className="secondary-btn"
                            >
                                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                            </button>

                            <button
                                onClick={verifyOTP}
                                disabled={loading}
                                className="primary-btn"
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