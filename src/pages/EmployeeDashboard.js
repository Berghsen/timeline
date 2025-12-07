import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Timeline from '../components/Timeline';
import AbsenceCertificates from '../components/AbsenceCertificates';
import Settings from '../components/Settings';
import './Dashboard.css';

const EmployeeDashboard = () => {
  const { user, signOut } = useAuth();
  const [activePage, setActivePage] = useState('timeline');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        onSignOut={signOut}
        isAdmin={false}
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
        {activePage === 'timeline' && <Timeline />}
        {activePage === 'absence-certificates' && <AbsenceCertificates isAdmin={false} />}
        {activePage === 'settings' && <Settings />}
      </div>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default EmployeeDashboard;

