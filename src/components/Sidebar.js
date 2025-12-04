import React from 'react';
import './Sidebar.css';

const Sidebar = ({ user, activePage, setActivePage, onSignOut, isAdmin, isOpen, onClose }) => {
  const handleNavClick = (page) => {
    setActivePage(page);
    if (onClose) onClose();
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="sidebar-close-button" onClick={onClose} aria-label="Close menu">
        ×
      </button>
      <div className="sidebar-header">
        <div className="logo-container">
          <img 
            src="https://cdn.asp.events/CLIENT_IBC_4ED0594D_5056_B739_542FB395BDA17423/sites/ibc-2023/media/libraries/2024-verified-suppliers/hpj-.png/fit-in/700x9999/filters:no_upscale()" 
            alt="Company Logo" 
            className="company-logo"
          />
        </div>
        <h2>Tijdregistratie</h2>
        <div className="user-info">
          <div className="user-name">{user?.profile?.full_name || user?.email}</div>
          <div className="user-role">{isAdmin ? 'Beheerder' : 'Medewerker'}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {isAdmin ? (
          <button
            className={`nav-item ${activePage === 'employees' ? 'active' : ''}`}
            onClick={() => handleNavClick('employees')}
          >
            Medewerkers
          </button>
        ) : (
          <button
            className={`nav-item ${activePage === 'timeline' ? 'active' : ''}`}
            onClick={() => handleNavClick('timeline')}
          >
            Tijdlijn
          </button>
        )}
      </nav>
      <div className="sidebar-footer">
        <button className="sign-out-button" onClick={onSignOut}>
          Uitloggen
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

