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
          <div className="user-role">
            {isAdmin ? 'Beheerder' : (user?.profile?.role || 'Medewerker')}
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {isAdmin ? (
          <>
            <button
              className={`nav-item ${activePage === 'employees' ? 'active' : ''}`}
              onClick={() => handleNavClick('employees')}
            >
              Tijdregistraties
            </button>
            <button
              className={`nav-item ${activePage === 'absence-certificates' ? 'active' : ''}`}
              onClick={() => handleNavClick('absence-certificates')}
            >
              Afwezigheidsattesten
            </button>
            <a
              className="nav-item nav-item-external"
              href="https://apps.trg.eu/planning/index.php"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                  if (onClose) onClose();
                  window.location.href = 'https://apps.trg.eu/planning/index.php';
                } else {
                  if (onClose) onClose();
                }
              }}
            >
              Planning
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="external-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              className="nav-item nav-item-external"
              href="https://www.hrms.be/web3/weblogin"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                  if (onClose) onClose();
                  window.location.href = 'https://www.hrms.be/web3/weblogin';
                } else {
                  if (onClose) onClose();
                }
              }}
            >
              HRMS
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="external-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </>
        ) : (
          <>
            <button
              className={`nav-item ${activePage === 'timeline' ? 'active' : ''}`}
              onClick={() => handleNavClick('timeline')}
            >
              Tijdlijn
            </button>
            <button
              className={`nav-item ${activePage === 'absence-certificates' ? 'active' : ''}`}
              onClick={() => handleNavClick('absence-certificates')}
            >
              Afwezigheidsattesten
            </button>
            <a
              className="nav-item nav-item-external"
              href="https://apps.trg.eu/planning/index.php"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                  if (onClose) onClose();
                  window.location.href = 'https://apps.trg.eu/planning/index.php';
                } else {
                  if (onClose) onClose();
                }
              }}
            >
              Planning
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="external-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a
              className="nav-item nav-item-external"
              href="https://www.hrms.be/web3/weblogin"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault();
                  if (onClose) onClose();
                  window.location.href = 'https://www.hrms.be/web3/weblogin';
                } else {
                  if (onClose) onClose();
                }
              }}
            >
              HRMS
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="external-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 3h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </>
        )}
        <button
          className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
          onClick={() => handleNavClick('settings')}
        >
          Instellingen
        </button>
      </nav>
      <div className="sidebar-footer">
        <button 
          className="sign-out-button" 
          onClick={async () => {
            try {
              await onSignOut();
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }}
        >
          Uitloggen
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

