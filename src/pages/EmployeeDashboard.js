import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Timeline from '../components/Timeline';
import './Dashboard.css';

const EmployeeDashboard = () => {
  const { user, signOut } = useAuth();
  const [activePage, setActivePage] = useState('timeline');

  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        onSignOut={signOut}
        isAdmin={false}
      />
      <div className="dashboard-content">
        {activePage === 'timeline' && <Timeline />}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

