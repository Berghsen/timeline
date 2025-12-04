import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Timeline.css';

const Timeline = () => {
  const { supabase, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [weekEntries, setWeekEntries] = useState([]);
  const [monthEntries, setMonthEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('date'); // 'date' or 'all'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    return new Date(monday.setHours(0, 0, 0, 0));
  });
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (viewMode === 'date') {
      fetchEntries();
    } else {
      fetchAllEntries();
    }
    fetchWeekEntries();
    fetchMonthEntries();
  }, [selectedDate, viewMode, currentWeekStart]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(100); // Limit to last 100 entries

      if (error) throw error;
      setAllEntries(data || []);
    } catch (err) {
      console.error('Error fetching all entries:', err);
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeekEntries = async () => {
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', currentWeekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setWeekEntries(data || []);
    } catch (err) {
      console.error('Error fetching week entries:', err);
    }
  };

  const fetchMonthEntries = async () => {
    try {
      const firstDay = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1);
      const lastDay = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDay.toISOString().split('T')[0])
        .lte('date', lastDay.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      setMonthEntries(data || []);
    } catch (err) {
      console.error('Error fetching month entries:', err);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setStartTime(entry.start_time);
    setEndTime(entry.end_time);
    setComment(entry.comment || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setStartTime('');
    setEndTime('');
    setComment('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!startTime || !endTime) {
      setError('Please fill in both start and end times');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      if (editingId) {
        // Update existing entry
        const { error } = await supabase
          .from('time_entries')
          .update({
            start_time: startTime,
            end_time: endTime,
            comment: comment || null,
          })
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('time_entries')
          .insert({
            user_id: user.id,
            date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            comment: comment || null,
          });

        if (error) throw error;
      }

      handleCancel();
      if (viewMode === 'date') {
        fetchEntries();
      } else {
        fetchAllEntries();
      }
      fetchWeekEntries();
      fetchMonthEntries();
    } catch (err) {
      console.error('Error saving entry:', err);
      setError(err.message || 'Failed to save entry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      if (viewMode === 'date') {
        fetchEntries();
      } else {
        fetchAllEntries();
      }
      fetchWeekEntries();
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError(err.message || 'Failed to delete entry');
    }
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

  const calculateTotalDuration = (entries) => {
    return entries.reduce((total, entry) => {
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      return total + (endMinutes - startMinutes);
    }, 0);
  };

  const navigateDate = (direction) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
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

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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

  const getWeekTotal = () => {
    return calculateTotalDuration(weekEntries);
  };

  const getMonthStats = () => {
    const totalMinutes = calculateTotalDuration(monthEntries);
    const uniqueDays = new Set(monthEntries.map(entry => entry.date)).size;
    const monthName = currentWeekStart.toLocaleDateString('en-US', { month: 'long' });
    
    return {
      totalHours: totalMinutes,
      totalDays: uniqueDays,
      monthName: monthName
    };
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

  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setViewMode('date');
    handleCancel();
  };

  const getEntriesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return weekEntries.filter(entry => entry.date === dateStr);
  };

  const getTotalForDate = (date) => {
    const dateEntries = getEntriesForDate(date);
    return calculateTotalDuration(dateEntries);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === selectedDate;
  };

  const entriesToShow = viewMode === 'date' ? entries : allEntries;
  const groupedEntries = viewMode === 'all' ? groupEntriesByDate(allEntries) : {};
  const totalMinutes = viewMode === 'date' 
    ? calculateTotalDuration(entries)
    : calculateTotalDuration(allEntries);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h1>Timeline</h1>
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'date' ? 'active' : ''}`}
            onClick={() => setViewMode('date')}
          >
            Single Date
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            All Entries
          </button>
        </div>
      </div>
      
      <div className="timeline-content">
        <div className="timeline-form-section">
          <h2>{editingId ? 'Edit Entry' : 'New Entry'}</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    handleCancel();
                  }}
                  disabled={!!editingId}
                />
              </div>
              <div className="form-group">
                <label htmlFor="startTime">Start Time</label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="comment">Comment</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="3"
                placeholder="Optional note about your work..."
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-button">
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="cancel-button">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="timeline-entries-section">
          {viewMode === 'date' ? (
            <>
              <div className="entries-header">
                <h2>Entries for {new Date(selectedDate).toLocaleDateString()}</h2>
                <div className="date-navigation">
                  <button onClick={() => navigateDate(-1)} className="nav-button">
                    ← Previous
                  </button>
                  <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="nav-button today">
                    Today
                  </button>
                  <button onClick={() => navigateDate(1)} className="nav-button">
                    Next →
                  </button>
                </div>
              </div>
              {entries.length > 0 && (
                <div className="date-summary">
                  Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </div>
              )}
              {loading ? (
                <div className="loading">Loading entries...</div>
              ) : entries.length === 0 ? (
                <div className="no-entries">No entries for this date</div>
              ) : (
                <div className="entries-list">
                  {entries.map((entry) => (
                    <div key={entry.id} className="entry-card">
                      <div className="entry-header">
                        <div className="entry-time">
                          {entry.start_time} - {entry.end_time}
                        </div>
                        <div className="entry-duration">
                          {calculateDuration(entry.start_time, entry.end_time)}
                        </div>
                      </div>
                      {entry.comment && (
                        <div className="entry-comment">{entry.comment}</div>
                      )}
                      <div className="entry-actions">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="entries-header">
                <h2>All Entries</h2>
                {allEntries.length > 0 && (
                  <div className="total-summary">
                    Total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m ({allEntries.length} entries)
                  </div>
                )}
              </div>
              {loading ? (
                <div className="loading">Loading entries...</div>
              ) : allEntries.length === 0 ? (
                <div className="no-entries">No entries found</div>
              ) : (
                <div className="all-entries-list">
                  {Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a)).map((date) => {
                    const dateEntries = groupedEntries[date];
                    const dateTotal = calculateTotalDuration(dateEntries);
                    return (
                      <div key={date} className="date-group">
                        <div className="date-group-header">
                          <h3>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                          <div className="date-group-total">
                            {Math.floor(dateTotal / 60)}h {dateTotal % 60}m ({dateEntries.length} {dateEntries.length === 1 ? 'entry' : 'entries'})
                          </div>
                        </div>
                        <div className="entries-list">
                          {dateEntries.map((entry) => (
                            <div key={entry.id} className="entry-card">
                              <div className="entry-header">
                                <div className="entry-time">
                                  {entry.start_time} - {entry.end_time}
                                </div>
                                <div className="entry-duration">
                                  {calculateDuration(entry.start_time, entry.end_time)}
                                </div>
                              </div>
                              {entry.comment && (
                                <div className="entry-comment">{entry.comment}</div>
                              )}
                              <div className="entry-actions">
                                <button
                                  onClick={() => {
                                    setSelectedDate(entry.date);
                                    setViewMode('date');
                                    handleEdit(entry);
                                  }}
                                  className="edit-button"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="delete-button"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="weekly-overview-section">
        <div className="weekly-header">
          <h2>Weekly Overview</h2>
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
        <div className="week-title">{getWeekTitle()}</div>
        <div className="week-total">
          Total: {Math.floor(getWeekTotal() / 60)}h {getWeekTotal() % 60}m
        </div>
        <div className="statistics-section">
          <div className="stat-card">
            <div className="stat-label">Total hours worked in Week {getWeekNumber(currentWeekStart)}</div>
            <div className="stat-value">{Math.floor(getWeekTotal() / 60)}h {getWeekTotal() % 60}m</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total days worked in {getMonthStats().monthName}</div>
            <div className="stat-value">{getMonthStats().totalDays} {getMonthStats().totalDays === 1 ? 'day' : 'days'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total hours worked in {getMonthStats().monthName}</div>
            <div className="stat-value">{Math.floor(getMonthStats().totalHours / 60)}h {getMonthStats().totalHours % 60}m</div>
          </div>
        </div>
        <div className="week-calendar">
          {getWeekDates().map((date, index) => {
            const dateEntries = getEntriesForDate(date);
            const totalMinutes = getTotalForDate(date);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = date.getDate();
            const isCurrentDay = isToday(date);
            const isSelectedDay = isSelected(date);

            return (
              <div
                key={index}
                className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''}`}
                onClick={() => handleDateClick(date)}
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
                      <div className="day-entry-preview">
                        {dateEntries.slice(0, 2).map((entry, idx) => (
                          <div key={idx} className="preview-entry">
                            {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                          </div>
                        ))}
                        {dateEntries.length > 2 && (
                          <div className="preview-more">+{dateEntries.length - 2} more</div>
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
    </div>
  );
};

export default Timeline;

