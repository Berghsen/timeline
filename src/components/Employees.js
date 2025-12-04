import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Employees.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const Employees = () => {
  const { supabase } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [travelTime, setTravelTime] = useState(0);
  const [editingTravelTime, setEditingTravelTime] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return new Date(monday.setHours(0, 0, 0, 0));
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeEntries(selectedEmployee.id);
      setTravelTime(selectedEmployee.travel_time_minutes || 0);
    }
  }, [selectedEmployee, currentWeekStart, currentMonth, currentYear]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/employees`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch employees: ${response.status}`);
      }

      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      // Show error to user
      alert(`Error loading employees: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeEntries = async (employeeId) => {
    setEntriesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/api/admin/employees/${employeeId}/time-entries`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch time entries');
      }

      const data = await response.json();
      setTimeEntries(data);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setTimeEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setViewMode('weekly');
    setTravelTime(employee.travel_time_minutes || 0);
    // fetchEmployeeEntries will be called by useEffect
  };

  const updateTravelTime = async () => {
    if (!selectedEmployee) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No active session');
        return;
      }

      const travelTimeValue = parseInt(travelTime);
      if (isNaN(travelTimeValue) || travelTimeValue < 0) {
        alert('Please enter a valid number (0 or greater)');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/employees/${selectedEmployee.id}/travel-time`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ travel_time_minutes: travelTimeValue }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update travel time: ${response.status}`);
      }

      const updatedEmployee = await response.json();
      setSelectedEmployee(updatedEmployee);
      setEditingTravelTime(false);
      
      // Update in employees list
      setEmployees(employees.map(emp => 
        emp.id === updatedEmployee.id ? updatedEmployee : emp
      ));
    } catch (error) {
      console.error('Error updating travel time:', error);
      alert(`Failed to update travel time: ${error.message}`);
    }
  };

  const calculateHoursWithTravelTime = (entries) => {
    const totalMinutes = entries.reduce((total, entry) => {
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      return total + (endMinutes - startMinutes);
    }, 0);
    
    // Deduct travel time for each unique day
    const uniqueDays = new Set(entries.map(e => e.date)).size;
    const travelTimeDeduction = uniqueDays * (selectedEmployee?.travel_time_minutes || 0);
    
    return {
      total: totalMinutes,
      afterTravel: Math.max(0, totalMinutes - travelTimeDeduction)
    };
  };

  const getHoursIncludingTravel = (entries) => {
    return entries.reduce((total, entry) => {
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      return total + (endMinutes - startMinutes);
    }, 0);
  };

  const getHoursExcludingTravel = (entries) => {
    const totalMinutes = getHoursIncludingTravel(entries);
    const uniqueDays = new Set(entries.map(e => e.date)).size;
    const travelTimeDeduction = uniqueDays * (selectedEmployee?.travel_time_minutes || 0);
    return Math.max(0, totalMinutes - travelTimeDeduction);
  };

  const calculateDuration = (start, end) => {
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const calculateTotalHours = () => {
    return timeEntries.reduce((total, entry) => {
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      return total + (endMinutes - startMinutes);
    }, 0);
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getWeekTitle = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startYear = currentWeekStart.getFullYear();
    const endYear = weekEnd.getFullYear();
    const weekNumber = getWeekNumber(currentWeekStart);
    
    let dateRange;
    if (startMonth === endMonth && startYear === endYear) {
      dateRange = `${startMonth} ${currentWeekStart.getDate()} - ${weekEnd.getDate()}, ${startYear}`;
    } else if (startYear === endYear) {
      dateRange = `${startMonth} ${currentWeekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${startYear}`;
    } else {
      dateRange = `${startMonth} ${currentWeekStart.getDate()}, ${startYear} - ${endMonth} ${weekEnd.getDate()}, ${endYear}`;
    }
    
    return `Week ${weekNumber} • ${dateRange}`;
  };

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setCurrentWeekStart(new Date(monday.setHours(0, 0, 0, 0)));
  };

  const getEntriesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return timeEntries.filter(entry => entry.date === dateStr);
  };

  const getTotalForDate = (date) => {
    const dateEntries = getEntriesForDate(date);
    const totalMinutes = dateEntries.reduce((total, entry) => {
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      return total + (endMinutes - startMinutes);
    }, 0);
    // Deduct travel time if there are entries for this day
    const travelDeduction = dateEntries.length > 0 ? (selectedEmployee?.travel_time_minutes || 0) : 0;
    return Math.max(0, totalMinutes - travelDeduction);
  };

  const getWeekTotals = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= currentWeekStart && entryDate <= weekEnd;
    });
    return calculateHoursWithTravelTime(weekEntries);
  };

  const getMonthTotals = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= firstDay && entryDate <= lastDay;
    });
    return calculateHoursWithTravelTime(monthEntries);
  };

  const getMonthStats = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const monthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= firstDay && entryDate <= lastDay;
    });
    
    const uniqueDays = new Set(monthEntries.map(entry => entry.date)).size;
    const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long' });
    
    return {
      totalDays: uniqueDays,
      monthName: monthName
    };
  };

  const navigateMonth = (direction) => {
    if (direction === 1) {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const getMonthDates = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const dates = [];
    const startDate = new Date(firstDay);
    
    // Start from the first day of the month
    while (startDate <= lastDay) {
      dates.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return dates;
  };

  const groupEntriesByDate = (entries) => {
    return entries.reduce((groups, entry) => {
      const date = entry.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {});
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="employees-container">
      <h1>Employees</h1>
      
      <div className="employees-content">
        <div className="employees-list-section">
          <h2>All Employees</h2>
          {loading ? (
            <div className="loading">Loading employees...</div>
          ) : employees.length === 0 ? (
            <div className="no-data">No employees found</div>
          ) : (
            <div className="employees-list">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className={`employee-card ${selectedEmployee?.id === employee.id ? 'selected' : ''}`}
                  onClick={() => handleEmployeeClick(employee)}
                >
                  <div className="employee-name">{employee.full_name || employee.email}</div>
                  <div className="employee-email">{employee.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="employee-entries-section">
          {selectedEmployee ? (
            <>
              <div className="employee-header">
                <h2>
                  {selectedEmployee.full_name || selectedEmployee.email}
                </h2>
                <div className="view-mode-toggle">
                  <button
                    className={`view-mode-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                    onClick={() => setViewMode('weekly')}
                  >
                    Weekly
                  </button>
                  <button
                    className={`view-mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                    onClick={() => setViewMode('monthly')}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="travel-time-setting">
                <label>Travel Time (minutes per day):</label>
                {editingTravelTime ? (
                  <div className="travel-time-input">
                    <input
                      type="number"
                      min="0"
                      value={travelTime}
                      onChange={(e) => setTravelTime(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateTravelTime();
                        }
                      }}
                    />
                    <button onClick={updateTravelTime} className="save-btn">Save</button>
                    <button onClick={() => {
                      setEditingTravelTime(false);
                      setTravelTime(selectedEmployee.travel_time_minutes || 0);
                    }} className="cancel-btn">Cancel</button>
                  </div>
                ) : (
                  <div className="travel-time-display">
                    <span>{selectedEmployee.travel_time_minutes || 0} minutes</span>
                    <button onClick={() => setEditingTravelTime(true)} className="edit-btn">Edit</button>
                  </div>
                )}
              </div>
              
              {entriesLoading ? (
                <div className="loading">Loading entries...</div>
              ) : timeEntries.length === 0 ? (
                <div className="no-data">No time entries for this employee</div>
              ) : (
                <>
                  {viewMode === 'weekly' ? (
                    <div className="calendar-view">
                      <div className="weekly-header">
                        <div className="week-title">{getWeekTitle()}</div>
                        <div className="week-navigation">
                          <button onClick={() => navigateWeek(-1)} className="nav-button">
                            ← Previous Week
                          </button>
                          <button onClick={goToCurrentWeek} className="nav-button today">
                            Current Week
                          </button>
                          <button onClick={() => navigateWeek(1)} className="nav-button">
                            Next Week →
                          </button>
                        </div>
                      </div>
                      <div className="week-totals">
                        <div className="total-item">
                          <span className="total-label">Hours worked (incl travel time):</span>
                          <span className="total-value">
                            {(() => {
                              const totals = getWeekTotals();
                              return `${Math.floor(totals.total / 60)}h ${totals.total % 60}m`;
                            })()}
                          </span>
                        </div>
                        <div className="total-item">
                          <span className="total-label">Hours worked (excl travel time):</span>
                          <span className="total-value">
                            {(() => {
                              const totals = getWeekTotals();
                              return `${Math.floor(totals.afterTravel / 60)}h ${totals.afterTravel % 60}m`;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="week-calendar">
                        {getWeekDates().map((date, index) => {
                          const dateEntries = getEntriesForDate(date);
                          const totalMinutes = getTotalForDate(date);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayNumber = date.getDate();
                          const isCurrentDay = isToday(date);

                          const dateStr = date.toISOString().split('T')[0];
                          const rawTotal = dateEntries.reduce((total, entry) => {
                            const startParts = entry.start_time.split(':').map(Number);
                            const endParts = entry.end_time.split(':').map(Number);
                            const startMinutes = startParts[0] * 60 + startParts[1];
                            const endMinutes = endParts[0] * 60 + endParts[1];
                            return total + (endMinutes - startMinutes);
                          }, 0);
                          const travelDeduction = dateEntries.length > 0 ? (selectedEmployee?.travel_time_minutes || 0) : 0;

                          return (
                            <div 
                              key={index} 
                              className={`calendar-day ${isCurrentDay ? 'today' : ''} ${dateEntries.length > 0 ? 'clickable' : ''}`}
                              onClick={() => dateEntries.length > 0 && setSelectedDate(dateStr)}
                            >
                              <div className="day-header">
                                <div className="day-name">{dayName}</div>
                                <div className="day-number">{dayNumber}</div>
                              </div>
                              <div className="day-entries">
                                {dateEntries.length > 0 ? (
                                  <>
                                    <div className="day-entry-count">{dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'}</div>
                                    <div className="day-total">
                                      {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                                    </div>
                                    {travelDeduction > 0 && (
                                      <div className="travel-deduction-small">
                                        -{travelDeduction}m travel
                                      </div>
                                    )}
                                    <div className="day-entry-preview">
                                      {dateEntries.slice(0, 3).map((entry, idx) => (
                                        <div key={idx} className="preview-entry">
                                          {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                                          {entry.comment && <span className="preview-comment-icon" title={entry.comment}>💬</span>}
                                        </div>
                                      ))}
                                      {dateEntries.length > 3 && (
                                        <div className="preview-more">+{dateEntries.length - 3} more</div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <div className="day-empty">No entries</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="monthly-view">
                      <div className="monthly-header">
                        <div className="month-title">
                          {new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="month-navigation">
                          <button onClick={() => navigateMonth(-1)} className="nav-button">
                            ← Previous Month
                          </button>
                          <button onClick={goToCurrentMonth} className="nav-button today">
                            Current Month
                          </button>
                          <button onClick={() => navigateMonth(1)} className="nav-button">
                            Next Month →
                          </button>
                        </div>
                      </div>
                      <div className="month-totals">
                        <div className="total-item">
                          <span className="total-label">Hours worked (incl travel time):</span>
                          <span className="total-value">
                            {(() => {
                              const totals = getMonthTotals();
                              return `${Math.floor(totals.total / 60)}h ${totals.total % 60}m`;
                            })()}
                          </span>
                        </div>
                        <div className="total-item">
                          <span className="total-label">Hours worked (excl travel time):</span>
                          <span className="total-value">
                            {(() => {
                              const totals = getMonthTotals();
                              return `${Math.floor(totals.afterTravel / 60)}h ${totals.afterTravel % 60}m`;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="month-stats">
                        <div className="stat-card">
                          <div className="stat-label">Days worked in {getMonthStats().monthName}</div>
                          <div className="stat-value">{getMonthStats().totalDays} {getMonthStats().totalDays === 1 ? 'day' : 'days'}</div>
                        </div>
                      </div>
                      <div className="month-calendar">
                        {getMonthDates().map((date, index) => {
                          const dateEntries = getEntriesForDate(date);
                          const rawTotal = dateEntries.reduce((total, entry) => {
                            const startParts = entry.start_time.split(':').map(Number);
                            const endParts = entry.end_time.split(':').map(Number);
                            const startMinutes = startParts[0] * 60 + startParts[1];
                            const endMinutes = endParts[0] * 60 + endParts[1];
                            return total + (endMinutes - startMinutes);
                          }, 0);
                          const travelDeduction = dateEntries.length > 0 ? (selectedEmployee?.travel_time_minutes || 0) : 0;
                          const netMinutes = Math.max(0, rawTotal - travelDeduction);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayNumber = date.getDate();
                          const isCurrentDay = isToday(date);
                          const dateStr = date.toISOString().split('T')[0];

                          return (
                            <div 
                              key={index} 
                              className={`month-calendar-day ${isCurrentDay ? 'today' : ''} ${dateEntries.length > 0 ? 'has-entries clickable' : ''}`}
                              onClick={() => dateEntries.length > 0 && setSelectedDate(dateStr)}
                            >
                              <div className="day-header">
                                <div className="day-name">{dayName}</div>
                                <div className="day-number">{dayNumber}</div>
                              </div>
                              <div className="day-entries">
                                {dateEntries.length > 0 ? (
                                  <>
                                    <div className="day-entry-count">{dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'}</div>
                                    <div className="day-total">
                                      {Math.floor(netMinutes / 60)}h {netMinutes % 60}m
                                    </div>
                                    {travelDeduction > 0 && (
                                      <div className="travel-deduction">
                                        -{travelDeduction}m travel
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="day-empty">-</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="no-selection">
              Select an employee to view their time entries
            </div>
          )}
        </div>
      </div>

      {selectedDate && (
        <div className="date-detail-modal" onClick={() => setSelectedDate(null)}>
          <div className="date-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="date-detail-header">
              <h3>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <button className="close-button" onClick={() => setSelectedDate(null)}>×</button>
            </div>
            <div className="date-detail-entries">
              {timeEntries.filter(entry => entry.date === selectedDate).map((entry) => {
                const startParts = entry.start_time.split(':').map(Number);
                const endParts = entry.end_time.split(':').map(Number);
                const startMinutes = startParts[0] * 60 + startParts[1];
                const endMinutes = endParts[0] * 60 + endParts[1];
                const duration = endMinutes - startMinutes;
                const travelDeduction = selectedEmployee?.travel_time_minutes || 0;
                const netDuration = Math.max(0, duration - travelDeduction);

                return (
                  <div key={entry.id} className="date-detail-entry">
                    <div className="detail-entry-header">
                      <div className="detail-time">
                        <strong>{entry.start_time} - {entry.end_time}</strong>
                      </div>
                      <div className="detail-duration">
                        {Math.floor(duration / 60)}h {duration % 60}m
                        {travelDeduction > 0 && (
                          <span className="detail-travel"> (after travel: {Math.floor(netDuration / 60)}h {netDuration % 60}m)</span>
                        )}
                      </div>
                    </div>
                    {entry.comment && (
                      <div className="detail-comment">
                        <strong>Comment:</strong> {entry.comment}
                      </div>
                    )}
                    <div className="detail-meta">
                      <span>Created: {new Date(entry.created_at).toLocaleString()}</span>
                      {entry.updated_at !== entry.created_at && (
                        <span>Updated: {new Date(entry.updated_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;

