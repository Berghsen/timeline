import React from 'react';
import './Sidebar.css';

const Sidebar = ({ user, activePage, setActivePage, onSignOut, isAdmin }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-container">
          <img 
            src="https://cdn.asp.events/CLIENT_IBC_4ED0594D_5056_B739_542FB395BDA17423/sites/ibc-2023/media/libraries/2024-verified-suppliers/hpj-.png/fit-in/700x9999/filters:no_upscale()" 
            alt="Company Logo" 
            className="company-logo"
          />
        </div>
        <h2>Time Tracker</h2>
        <div className="user-info">
          <div className="user-name">{user?.profile?.full_name || user?.email}</div>
          <div className="user-role">{isAdmin ? 'Administrator' : 'Employee'}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {isAdmin ? (
          <button
            className={`nav-item ${activePage === 'employees' ? 'active' : ''}`}
            onClick={() => setActivePage('employees')}
          >
            Employees
          </button>
        ) : (
          <button
            className={`nav-item ${activePage === 'timeline' ? 'active' : ''}`}
            onClick={() => setActivePage('timeline')}
          >
            Timeline
          </button>
        )}
      </nav>
      <div className="sidebar-footer">
        <button className="sign-out-button" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

