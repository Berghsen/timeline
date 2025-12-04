import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Employees from '../components/Employees';
import './Dashboard.css';

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [activePage, setActivePage] = useState('employees');

  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        onSignOut={signOut}
        isAdmin={true}
      />
      <div className="dashboard-content">
        {activePage === 'employees' && <Employees />}
      </div>
    </div>
  );
};

export default AdminDashboard;

