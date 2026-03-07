import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            {/* Main content: adds top padding on mobile for hamburger button */}
            <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
                {children}
            </div>
        </div>
    );
};

export default Layout;
