import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, FileCheck, LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const menuItems = [
        { name: 'Offer Letter Editor', path: '/editor', icon: <FileText className="w-5 h-5 flex-shrink-0" /> },
        { name: 'Policy Agreement', path: '/policy', icon: <FileCheck className="w-5 h-5 flex-shrink-0" /> },
        { name: 'Relieving & Experience', path: '/relieving-letter', icon: <FileCheck className="w-5 h-5 flex-shrink-0" /> },
        { name: 'Probation Confirmation', path: '/probation-letter', icon: <FileCheck className="w-5 h-5 flex-shrink-0" /> },
        { name: 'Salary Hike Notification', path: '/salary-hike', icon: <FileCheck className="w-5 h-5 flex-shrink-0" /> }
    ];

    const NavContent = ({ onClickItem }) => (
        <>
            {/* Logo + Brand */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
                <img
                    src="/vtab.jpg"
                    alt="VTAB"
                    className="w-9 h-9 object-contain bg-white rounded-lg p-[3px] flex-shrink-0"
                />
                {!collapsed && (
                    <div>
                        <p className="text-xs font-bold text-white leading-none">VTAB Square</p>
                        <p className="text-[10px] text-white/50 mt-0.5">Admin Portal</p>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-4 px-2 space-y-1">
                {menuItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => { navigate(item.path); if (onClickItem) onClickItem(); }}
                            title={collapsed ? item.name : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                                : 'hover:bg-white/8 text-slate-300 hover:text-white'
                                } ${collapsed ? 'justify-center' : ''}`}
                        >
                            <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'} transition-colors`}>
                                {item.icon}
                            </span>
                            {!collapsed && <span className="text-[13px] font-semibold truncate">{item.name}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-2 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    title={collapsed ? 'Logout' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-[13px] font-semibold">Logout</span>}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile: Hamburger button (top-left, shown only on mobile) */}
            <button
                className="lg:hidden fixed top-3 left-3 z-[200] bg-[#0A2458] text-white p-2 rounded-xl shadow-lg"
                onClick={() => setMobileOpen(true)}
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile: Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile: Drawer */}
            <div className={`lg:hidden fixed top-0 left-0 h-full z-[160] bg-[#0A2458] flex flex-col transition-transform duration-300 w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button
                    className="absolute top-3 right-3 text-white/50 hover:text-white p-1"
                    onClick={() => setMobileOpen(false)}
                >
                    <X className="w-5 h-5" />
                </button>
                <NavContent onClickItem={() => setMobileOpen(false)} />
            </div>

            {/* Desktop: Collapsible Sidebar */}
            <div
                className={`hidden lg:flex flex-col bg-[#0A2458] h-screen sticky top-0 transition-all duration-300 border-r border-white/10 relative ${collapsed ? 'w-[68px]' : 'w-56'
                    }`}
            >
                <NavContent />
                {/* Collapse toggle button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-0.5 top-14 bg-white border border-slate-200 text-[#0A2458] w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-50 transition-all z-50 group"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
            </div>
        </>
    );
};

export default Sidebar;
