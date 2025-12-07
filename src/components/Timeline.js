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
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    return new Date(monday.setHours(0, 0, 0, 0));
  });
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [comment, setComment] = useState('');
  const [rechtstreeks, setRechtstreeks] = useState(false);
  const [nietGewerkt, setNietGewerkt] = useState(false);
  const [verlof, setVerlof] = useState(false);
  const [ziek, setZiek] = useState(false);
  const [bonnummer, setBonnummer] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchWeekEntries();
    fetchMonthEntries();
    if (viewMode === 'weekly') {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekDates = getWeekDates();
      const dateInWeek = weekDates.find(d => d.toISOString().split('T')[0] === selectedDate);
      if (dateInWeek) {
        fetchEntries();
      }
    } else {
      fetchAllEntries();
    }
  }, [selectedDate, viewMode, currentWeekStart, currentMonth, currentYear]);

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
    setRechtstreeks(entry.rechtstreeks || false);
    setNietGewerkt(entry.niet_gewerkt || false);
    setVerlof(entry.verlof || false);
    setZiek(entry.ziek || false);
    setBonnummer(entry.bonnummer || '');
    setSelectedDate(entry.date);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setStartTime('');
    setEndTime('');
    setComment('');
    setRechtstreeks(false);
    setNietGewerkt(false);
    setVerlof(false);
    setZiek(false);
    setBonnummer('');
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // If niet_gewerkt, verlof, or ziek is checked, start/end time is optional
    const hasStatus = nietGewerkt || verlof || ziek;
    
    if (!hasStatus && (!startTime || !endTime)) {
      setError('Vul zowel start- als eindtijd in');
      return;
    }
    
    if (!hasStatus && startTime >= endTime && startTime && endTime) {
      // Only validate time order if we have times and no status checkbox
      // (end time after midnight is allowed)
    }

    // Handle end time after midnight (e.g., 16:00 to 02:00 = 10 hours)
    // The database TIME field can't store values > 24:00, so we store the actual time
    // We'll calculate duration correctly in display by checking if end < start
    // No need to modify endTime - store it as entered (e.g., "02:00" not "26:00")
    let endTimeToUse = endTime;

    try {
      // Build data object
      const data = {
        start_time: hasStatus ? null : startTime,
        end_time: hasStatus ? null : endTimeToUse,
        comment: comment || null,
        rechtstreeks: rechtstreeks || false,
        niet_gewerkt: nietGewerkt || false,
        verlof: verlof || false,
        ziek: ziek || false,
      };
      
      // Add bonnummer if provided
      if (bonnummer) {
        data.bonnummer = bonnummer;
      }

      if (editingId) {
        // Update existing entry
        const { error } = await supabase
          .from('time_entries')
          .update(data)
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('time_entries')
          .insert({
            ...data,
            user_id: user.id,
            date: selectedDate,
          });

        if (error) throw error;
      }

      handleCancel();
      fetchEntries();
      fetchAllEntries();
      fetchWeekEntries();
      fetchMonthEntries();
      setError('');
    } catch (err) {
      console.error('Error saving entry:', err);
      setError(err.message || 'Failed to save entry');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Weet u zeker dat u dit item wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      fetchEntries();
      fetchAllEntries();
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
      let startMinutes = startParts[0] * 60 + startParts[1];
      let endMinutes = endParts[0] * 60 + endParts[1];
      
      // Handle end time after midnight
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours
      }
      
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
    const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long' });
    
    return {
      totalHours: totalMinutes,
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
    
    while (startDate <= lastDay) {
      dates.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    
    return dates;
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

  // Helper function to format date in local timezone (fixes timezone bug)
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (date) => {
    const dateStr = formatDateLocal(date);
    const dateEntries = getEntriesForDate(date);
    
    if (dateEntries.length > 0) {
      // If there are entries, edit the first one
      const firstEntry = dateEntries[0];
      setSelectedDate(dateStr);
      setEditingId(firstEntry.id);
      setStartTime(firstEntry.start_time);
      setEndTime(firstEntry.end_time);
      setComment(firstEntry.comment || '');
      setRechtstreeks(firstEntry.rechtstreeks || false);
      setNietGewerkt(firstEntry.niet_gewerkt || false);
      setVerlof(firstEntry.verlof || false);
      setZiek(firstEntry.ziek || false);
      setBonnummer(firstEntry.bonnummer || '');
      setShowForm(true);
    } else {
      // If no entries, create a new one
      setSelectedDate(dateStr);
      setShowForm(true);
      setEditingId(null);
      setStartTime('');
      setEndTime('');
      setComment('');
      setRechtstreeks(false);
      setNietGewerkt(false);
      setVerlof(false);
      setZiek(false);
      setBonnummer('');
    }
  };

  const handleAddNew = () => {
    setShowForm(true);
    setEditingId(null);
      setStartTime('');
      setEndTime('');
      setComment('');
      setRechtstreeks(false);
      setNietGewerkt(false);
      setVerlof(false);
      setZiek(false);
      setBonnummer('');
      setSelectedDate(formatDateLocal(new Date()));
  };

  const getEntriesForDate = (date) => {
    const dateStr = formatDateLocal(date);
    if (viewMode === 'weekly') {
      return weekEntries.filter(entry => entry.date === dateStr);
    } else {
      return monthEntries.filter(entry => entry.date === dateStr);
    }
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
    const dateStr = formatDateLocal(date);
    return dateStr === selectedDate;
  };

  const entriesToShow = entries;
  const groupedEntries = viewMode === 'monthly' ? groupEntriesByDate(monthEntries) : {};

  return (
    <div className="timeline-container">

      {showForm && (
        <div className="entry-modal-overlay" onClick={handleCancel}>
          <div className="entry-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingId ? 'Item Bewerken' : 'Nieuw Item'}</h2>
              <button className="close-form-button" onClick={handleCancel}>×</button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Datum</label>
                <input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                  }}
                  disabled={!!editingId}
                />
              </div>
              <div className="form-group">
                <label htmlFor="startTime">Starttijd {nietGewerkt || verlof || ziek ? '(optioneel)' : ''}</label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={!nietGewerkt && !verlof && !ziek}
                  disabled={nietGewerkt || verlof || ziek}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">Eindtijd {nietGewerkt || verlof || ziek ? '(optioneel)' : ''}</label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={!nietGewerkt && !verlof && !ziek}
                  disabled={nietGewerkt || verlof || ziek}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="bonnummer">Bonnummer</label>
              <input
                id="bonnummer"
                type="text"
                value={bonnummer}
                onChange={(e) => setBonnummer(e.target.value)}
                placeholder="bv: 2251922"
              />
            </div>
            <div className="form-group">
              <label htmlFor="comment">Opmerking</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="2"
                placeholder="bv: Permanentie 71"
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rechtstreeks}
                  onChange={(e) => setRechtstreeks(e.target.checked)}
                />
                Rechtstreeks
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={nietGewerkt}
                  onChange={(e) => setNietGewerkt(e.target.checked)}
                />
                Niet gewerkt
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={verlof}
                  onChange={(e) => setVerlof(e.target.checked)}
                />
                Verlof
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={ziek}
                  onChange={(e) => setZiek(e.target.checked)}
                />
                Ziek
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-button">
                {editingId ? 'Bijwerken' : 'Opslaan'}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={async () => {
                    if (window.confirm('Weet u zeker dat u dit item wilt verwijderen?')) {
                      await handleDelete(editingId);
                      handleCancel();
                    }
                  }} 
                  className="delete-button-form"
                  title="Verwijderen"
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: '1.2rem', cursor: 'pointer', color: '#000' }}
                >
                  🗑️
                </button>
              )}
              <button type="button" onClick={handleCancel} className="cancel-button">
                Annuleren
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {viewMode === 'weekly' ? (
        <div className="weekly-overview-section">
          <div className="weekly-header">
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                onClick={() => setViewMode('weekly')}
              >
                Week
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                onClick={() => setViewMode('monthly')}
              >
                Maand
              </button>
            </div>
            <div className="week-navigation">
              <button onClick={() => navigateWeek(-1)} className="nav-button">
                ← Vorige Week
              </button>
              <button onClick={goToCurrentWeek} className="nav-button today">
                Huidige Week
              </button>
              <button onClick={() => navigateWeek(1)} className="nav-button">
                Volgende Week →
              </button>
            </div>
            <button className="add-entry-button" onClick={handleAddNew} title="Nieuw item toevoegen">
              +
            </button>
          </div>
          <div className="week-title">{getWeekTitle()}</div>
          <div className="week-total">
            Totaal: {Math.floor(getWeekTotal() / 60)}u {getWeekTotal() % 60}m
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
              const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
              const dayNumber = date.getDate();
              const isCurrentDay = isToday(date);
              const isSelectedDay = isSelected(date);
              const firstEntry = dateEntries.length > 0 ? dateEntries[0] : null;
              const statusClass = firstEntry ? 
                (firstEntry.verlof ? 'status-verlof' : 
                 firstEntry.ziek ? 'status-ziek' : 
                 firstEntry.niet_gewerkt ? 'status-niet-gewerkt' : 
                 'status-gewerkt') : '';

              return (
                <div
                  key={index}
                  className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''} ${statusClass} clickable`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="day-header">
                    <div className="day-name">{dayName}</div>
                    <div className="day-number">{dayNumber}</div>
                  </div>
                  <div className="day-entries">
                    {dateEntries.length > 0 ? (
                      <>
                        {(() => {
                          const firstEntry = dateEntries[0];
                          const hasStatus = firstEntry.niet_gewerkt || firstEntry.verlof || firstEntry.ziek;
                          const statusClass = firstEntry.verlof ? 'status-verlof' : 
                                            firstEntry.ziek ? 'status-ziek' : 
                                            firstEntry.niet_gewerkt ? 'status-niet-gewerkt' : 
                                            'status-gewerkt';
                          
                          return (
                            <>
                              <div className={`day-status ${statusClass}`}>
                                {firstEntry.verlof ? 'Verlof' : 
                                 firstEntry.ziek ? 'Ziek' : 
                                 firstEntry.niet_gewerkt ? 'Niet gewerkt' : 
                                 firstEntry.start_time && firstEntry.end_time ? 
                                   `${firstEntry.start_time.substring(0, 5)} - ${firstEntry.end_time.substring(0, 5)}` : 
                                   'Gewerkt'}
                              </div>
                              {!hasStatus && (
                                <div className="day-total">
                                  {Math.floor(totalMinutes / 60)}u {totalMinutes % 60}m
                                </div>
                              )}
                              {dateEntries.length > 1 && (
                                <div className="day-entry-count">{dateEntries.length} items</div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="day-empty">Klik om toe te voegen</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="monthly-overview-section">
          <div className="monthly-header">
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'weekly' ? 'active' : ''}`}
                onClick={() => setViewMode('weekly')}
              >
                Week
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                onClick={() => setViewMode('monthly')}
              >
                Maand
              </button>
            </div>
            <div className="month-navigation">
              <button onClick={() => navigateMonth(-1)} className="nav-button">
                ← Vorige Maand
              </button>
              <button onClick={goToCurrentMonth} className="nav-button today">
                Huidige Maand
              </button>
              <button onClick={() => navigateMonth(1)} className="nav-button">
                Volgende Maand →
              </button>
            </div>
            <button className="add-entry-button" onClick={handleAddNew} title="Nieuw item toevoegen">
              +
            </button>
          </div>
          <div className="month-title">
            {new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
          </div>
          <div className="month-total">
            Totaal: {Math.floor(getMonthStats().totalHours / 60)}u {getMonthStats().totalHours % 60}m
          </div>
          <div className="statistics-section">
            <div className="stat-card">
              <div className="stat-label">Totaal gewerkte dagen in {getMonthStats().monthName}</div>
              <div className="stat-value">{getMonthStats().totalDays} {getMonthStats().totalDays === 1 ? 'dag' : 'dagen'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Totaal gewerkte uren in {getMonthStats().monthName}</div>
              <div className="stat-value">{Math.floor(getMonthStats().totalHours / 60)}u {getMonthStats().totalHours % 60}m</div>
            </div>
          </div>
          <div className="month-calendar">
            {getMonthDates().map((date, index) => {
              const dateEntries = getEntriesForDate(date);
              const totalMinutes = getTotalForDate(date);
              const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
              const dayNumber = date.getDate();
              const isCurrentDay = isToday(date);

              const firstEntry = dateEntries.length > 0 ? dateEntries[0] : null;
              const statusClass = firstEntry ? 
                (firstEntry.verlof ? 'status-verlof' : 
                 firstEntry.ziek ? 'status-ziek' : 
                 firstEntry.niet_gewerkt ? 'status-niet-gewerkt' : 
                 'status-gewerkt') : '';

              return (
                <div
                  key={index}
                  className={`month-calendar-day ${isCurrentDay ? 'today' : ''} ${dateEntries.length > 0 ? 'has-entries' : ''} ${statusClass} clickable`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="day-header">
                    <div className="day-name">{dayName}</div>
                    <div className="day-number">{dayNumber}</div>
                  </div>
                  <div className="day-entries">
                    {dateEntries.length > 0 ? (
                      <>
                        {(() => {
                          const hasStatus = firstEntry.niet_gewerkt || firstEntry.verlof || firstEntry.ziek;
                          
                          return (
                            <>
                              <div className={`day-status ${statusClass}`}>
                                {firstEntry.verlof ? 'Verlof' : 
                                 firstEntry.ziek ? 'Ziek' : 
                                 firstEntry.niet_gewerkt ? 'Niet gewerkt' : 
                                 firstEntry.start_time && firstEntry.end_time ? 
                                   `${firstEntry.start_time.substring(0, 5)} - ${firstEntry.end_time.substring(0, 5)}` : 
                                   'Gewerkt'}
                              </div>
                              {!hasStatus && (
                                <div className="day-total">
                                  {Math.floor(totalMinutes / 60)}u {totalMinutes % 60}m
                                </div>
                              )}
                            </>
                          );
                        })()}
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


      {viewMode === 'monthly' && (
        <div className="timeline-entries-section">
          <div className="entries-header">
            <h2>Alle Items</h2>
            {allEntries.length > 0 && (
              <div className="total-summary">
                Totaal: {Math.floor(calculateTotalDuration(allEntries) / 60)}u {calculateTotalDuration(allEntries) % 60}m ({allEntries.length} items)
              </div>
            )}
          </div>
          {loading ? (
            <div className="loading">Items laden...</div>
          ) : allEntries.length === 0 ? (
            <div className="no-entries">Geen items gevonden</div>
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
                        {Math.floor(dateTotal / 60)}u {dateTotal % 60}m ({dateEntries.length} {dateEntries.length === 1 ? 'item' : 'items'})
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
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(entry);
                              }}
                              className="edit-button"
                            >
                              Bewerken
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(entry.id);
                              }}
                              className="delete-button"
                            >
                              Verwijderen
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
        </div>
      )}
    </div>
  );
};

export default Timeline;

