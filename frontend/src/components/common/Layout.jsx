import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="flex pt-16">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main
          className={`
            flex-1 transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'lg:ml-64' : ''}
            min-h-[calc(100vh-4rem)]
          `}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

