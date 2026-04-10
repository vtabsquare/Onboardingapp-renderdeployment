import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { Shield, X, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * OtpModal – A premium OTP verification popup.
 */
const OtpModal = ({ isOpen, onClose, onVerified, actionLabel = 'continue' }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'verifying' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [adminEmail, setAdminEmail] = useState('the admin email');
    const inputRefs = useRef([]);
    const cooldownRef = useRef(null);

    // Auto-send OTP when modal opens
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setStatus('idle');
            setErrorMsg('');
            sendOtp();
        }
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, [isOpen]);

    // Focus first input after sending
    useEffect(() => {
        if (status === 'sent') {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [status]);

    const startCooldown = () => {
        setResendCooldown(30);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(cooldownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const sendOtp = async () => {
        try {
            setStatus('sending');
            setErrorMsg('');
            const res = await API.post('/otp/generate');
            // Backend returns the email it sent to — display it in the UI
            if (res.data.email) {
                setAdminEmail(res.data.email);
            }
            setStatus('sent');
            startCooldown();
        } catch (err) {
            setStatus('error');
            setErrorMsg(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        }
    };

    const handleInput = (index, value) => {
        const digit = value.replace(/\D/, '').slice(-1);
        const newOtp = [...otp];
        newOtp[index] = digit;
        setOtp(newOtp);
        setErrorMsg('');

        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-verify when all 6 digits are filled
        if (digit && index === 5) {
            const full = [...newOtp.slice(0, 5), digit].join('');
            if (full.length === 6) {
                verifyOtp(full);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') {
            const full = otp.join('');
            if (full.length === 6) verifyOtp(full);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = pasted.split('');
        while (newOtp.length < 6) newOtp.push('');
        setOtp(newOtp);
        if (pasted.length === 6) {
            setTimeout(() => verifyOtp(pasted), 50);
        } else {
            inputRefs.current[Math.min(pasted.length, 5)]?.focus();
        }
    };

    const verifyOtp = async (otpValue) => {
        const code = otpValue || otp.join('');
        if (code.length !== 6) {
            setErrorMsg('Please enter all 6 digits.');
            return;
        }
        try {
            setStatus('verifying');
            setErrorMsg('');
            const res = await API.post('/otp/verify', { otp: code });
            if (res.data.success) {
                setStatus('idle');
                onVerified();
            } else {
                setStatus('sent');
                setErrorMsg(res.data.message || 'Invalid OTP. Please try again.');
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            setStatus('sent');
            setErrorMsg(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    if (!isOpen) return null;

    const isVerifying = status === 'verifying';
    const isSending = status === 'sending';
    const otpFull = otp.join('').length === 6;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-xl p-2">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-none">Verification Required</h3>
                            <p className="text-indigo-200 text-xs mt-1">Admin approval needed to {actionLabel}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1.5 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                    {/* Status Line */}
                    {isSending ? (
                        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5">
                            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                            <p className="text-indigo-700 text-sm">Sending OTP to <strong>{adminEmail}</strong>…</p>
                        </div>
                    ) : status === 'error' ? (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <p className="text-red-700 text-sm">{errorMsg}</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <p className="text-emerald-700 text-sm">OTP sent to <strong>{adminEmail}</strong>.</p>
                        </div>
                    )}

                    {/* OTP Input */}
                    <div className="mb-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                            Enter 6-digit OTP
                        </label>
                        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => inputRefs.current[i] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleInput(i, e.target.value)}
                                    onKeyDown={e => handleKeyDown(i, e)}
                                    disabled={isSending || isVerifying}
                                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                                        ${digit ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
                                        ${errorMsg ? 'border-red-400 bg-red-50' : ''}
                                        focus:border-indigo-500 focus:bg-indigo-50`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Verify Button */}
                    <button
                        onClick={() => verifyOtp()}
                        disabled={!otpFull || isVerifying || isSending}
                        className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        {isVerifying ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
                        ) : (
                            <><Shield className="w-4 h-4" />Verify & {actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)}</>
                        )}
                    </button>

                    {/* Resend */}
                    <div className="mt-4 text-center">
                        {resendCooldown > 0 ? (
                            <p className="text-slate-400 text-sm">Resend in <strong className="text-slate-600">{resendCooldown}s</strong></p>
                        ) : (
                            <button
                                onClick={sendOtp}
                                disabled={isSending || isVerifying}
                                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center justify-center gap-1.5"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />Resend OTP
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OtpModal;
