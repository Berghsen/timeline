import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Employees from '../components/Employees';
import Settings from '../components/Settings';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [activePage, setActivePage] = useState('employees');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        onSignOut={signOut}
        isAdmin={true}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="dashboard-content">
        <button 
          className="mobile-menu-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Menu openen"
        >
          ☰
        </button>
        {activePage === 'employees' && <Employees />}
        {activePage === 'settings' && <Settings />}
      </div>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default AdminDashboard;

