import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-6">
                    <h1 className="text-3xl font-bold mb-4 text-red-600">Something went wrong</h1>
                    <p className="text-lg mb-6">The application encountered an unexpected error.</p>
                    <div className="bg-white p-4 rounded shadow max-w-2xl w-full mb-6 overflow-auto">
                        <pre className="text-sm text-red-500 whitespace-pre-wrap">
                            {this.state.error?.toString()}
                        </pre>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                        Return to Login
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
