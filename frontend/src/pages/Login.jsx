import { useState, useEffect } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // VTAB 365 SSO — catch ?token= from URL and auto-login
    useEffect(() => {
        const ssoToken = new URLSearchParams(window.location.search).get("token");
        if (ssoToken) {
            setLoading(true);
            API.post("/user-auth/vtab-sso", { token: ssoToken })
                .then(res => {
                    if (res.data.success) {
                        localStorage.removeItem("adminToken");
                        localStorage.removeItem("faceMatchToken");
                        localStorage.setItem("token", res.data.token);
                        localStorage.setItem("userToken", res.data.token);
                        localStorage.setItem("role", "user");
                        navigate("/editor");
                    }
                })
                .catch(err => {
                    setMsg(err.response?.data?.message || "SSO connection failed. Please try again.");
                    setLoading(false);
                });
        }
    }, [navigate]);

    const submit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setMsg("Email and password required");
            return;
        }

        setLoading(true);
        setMsg("");

        try {
            // Using the new user authentication endpoint
            const res = await API.post("/user-auth/user/login", { email, password });

            if (res.data.success) {
                localStorage.removeItem("token");
                localStorage.removeItem("adminToken");
                localStorage.removeItem("userToken");
                
                if (res.data.resetRequired) {
                    // Redirect to password reset page with the temporary token
                    localStorage.setItem("resetToken", res.data.token);
                    navigate("/user/reset-password");
                } else if (res.data.faceMatchRequired) {
                    // Redirect to face match page with the verification token
                    localStorage.setItem("faceMatchToken", res.data.token);
                    navigate("/user/face-match");
                }
            }
        } catch (err) {
            setMsg(err.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-violet-100">

            {/* Animated Background Blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-sm px-4"
            >
                <div className="glass p-8 rounded-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
                            <LogIn className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                            User Login
                        </h2>
                        <p className="text-gray-500 mt-2">
                            Access your secure offer portal
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="your@email.com"
                                    className="glass-input block w-full pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="glass-input block w-full pl-11 pr-4 py-3 text-gray-900 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {msg && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{msg}</span>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-3.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                "Continue to Verification"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center border-t border-gray-100 pt-6">
                        <button 
                            onClick={() => navigate('/admin/login')}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            Are you an Admin? Sign in here
                        </button>
                    </div>

                    <p className="mt-8 text-center text-xs text-gray-400 font-medium">
                        New user? Check your email for login instructions.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
