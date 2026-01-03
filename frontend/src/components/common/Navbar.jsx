import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import QLogo from '../../assets/q-logo.svg';

const Navbar = ({ onToggleSidebar, sidebarOpen = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg fixed top-0 left-0 right-0 z-40">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo - Leftmost position */}
            <div className="flex items-center space-x-2 mr-6">
              <img src={QLogo} alt="Q" className="h-8 w-8" />
              <span className="text-lg font-bold tracking-wide">automation</span>
            </div>
            {/* Sidebar Toggle Button */}
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white mr-4"
                aria-label="Toggle sidebar"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="text-xl font-bold">
                IoT Dashboard
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {user?.username} ({user?.role})
            </span>
            <button
              onClick={handleLogout}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

