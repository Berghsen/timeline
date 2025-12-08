import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [status, setStatus] = useState(''); // 'niet_gewerkt', 'verlof', 'ziek', 'recup', or ''
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

  // Prevent body scroll when modal is open and preserve scroll position
  const scrollPositionRef = useRef(0);
  
  useEffect(() => {
    if (showForm) {
      // Save current scroll position
      scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      
      // Scroll to top first, especially important on mobile
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Small delay to ensure scroll completes before fixing body
      setTimeout(() => {
        // Prevent background scrolling
        document.body.style.position = 'fixed';
        document.body.style.top = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
        // Prevent touch scrolling on iOS
        document.body.style.touchAction = 'none';
        // Also prevent scrolling on html element
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';
      }, 10);
    } else {
      // Restore scroll position
      const scrollY = scrollPositionRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      if (scrollY) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    }
    return () => {
      // Cleanup on unmount
      const scrollY = scrollPositionRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      if (scrollY) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      }
    };
  }, [showForm]);

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
      
      // Format dates in local timezone to avoid timezone issues
      const weekStartStr = formatDateLocal(currentWeekStart);
      const weekEndStr = formatDateLocal(weekEnd);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setWeekEntries(data || []);
    } catch (err) {
      console.error('Error fetching week entries:', err);
    }
  };

  const fetchMonthEntries = async () => {
    return fetchMonthEntriesForStats(currentMonth, currentYear);
  };

  const fetchMonthEntriesForStats = async (targetMonth, targetYear) => {
    try {
      const firstDay = new Date(targetYear, targetMonth, 1);
      const lastDay = new Date(targetYear, targetMonth + 1, 0);
      
      // Format dates in local timezone
      const firstYear = firstDay.getFullYear();
      const firstMonth = String(firstDay.getMonth() + 1).padStart(2, '0');
      const firstDayNum = String(firstDay.getDate()).padStart(2, '0');
      const firstDayStr = `${firstYear}-${firstMonth}-${firstDayNum}`;
      
      const lastYear = lastDay.getFullYear();
      const lastMonth = String(lastDay.getMonth() + 1).padStart(2, '0');
      const lastDayNum = String(lastDay.getDate()).padStart(2, '0');
      const lastDayStr = `${lastYear}-${lastMonth}-${lastDayNum}`;

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', firstDayStr)
        .lte('date', lastDayStr)
        .order('date', { ascending: true });

      if (error) throw error;
      setMonthEntries(data || []);
    } catch (err) {
      console.error('Error fetching month entries:', err);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setStartTime(entry.start_time || '');
    setEndTime(entry.end_time || '');
    setComment(entry.comment || '');
    setRechtstreeks(entry.rechtstreeks || false);
    // Set status dropdown based on entry
    if (entry.niet_gewerkt) {
      setStatus('niet_gewerkt');
    } else if (entry.verlof) {
      setStatus('verlof');
    } else if (entry.ziek) {
      setStatus('ziek');
    } else if (entry.recup) {
      setStatus('recup');
    } else {
      setStatus('');
    }
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
    setStatus('');
    setBonnummer('');
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Time fields are optional - can be left empty if status is selected
    const hasStatus = status !== '';
    
    // Only validate times if they are provided and no status is selected
    if (!hasStatus && startTime && endTime) {
      // Validate time order (end time after midnight is allowed, so we check differently)
      // This validation is handled in calculateDuration
    }

    // Handle end time after midnight (e.g., 16:00 to 02:00 = 10 hours)
    // The database TIME field can't store values > 24:00, so we store the actual time
    // We'll calculate duration correctly in display by checking if end < start
    // No need to modify endTime - store it as entered (e.g., "02:00" not "26:00")
    let endTimeToUse = endTime;

    try {
      // Build data object
      const data = {
        start_time: startTime || null,
        end_time: endTimeToUse || null,
        comment: comment || null,
        rechtstreeks: rechtstreeks || false,
        niet_gewerkt: status === 'niet_gewerkt',
        verlof: status === 'verlof',
        ziek: status === 'ziek',
        recup: status === 'recup',
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
    if (!start || !end) {
      return '0h 0m';
    }
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    let durationMinutes = endMinutes - startMinutes;
    if (durationMinutes <= 0) {
      durationMinutes += 24 * 60;
    }
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const calculateTotalDuration = (entries) => {
    return entries.reduce((total, entry) => {
      if (!entry.start_time || !entry.end_time) {
        return total;
      }
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

  // Calculate night hours (1 AM - 6 AM)
  const calculateNightHours = (entries) => {
    return entries.reduce((total, entry) => {
      if (!entry.start_time || !entry.end_time || entry.niet_gewerkt || entry.verlof || entry.ziek || entry.recup) {
        return total;
      }
      
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      let startMinutes = startParts[0] * 60 + startParts[1];
      let endMinutes = endParts[0] * 60 + endParts[1];
      
      // Handle end time after midnight
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }
      
      // Night hours are between 1 AM (60 minutes) and 6 AM (360 minutes)
      const nightStart = 1 * 60; // 1 AM
      const nightEnd = 6 * 60;   // 6 AM
      
      let nightMinutes = 0;
      
      // Check if the entry spans the night period
      // Case 1: Entry starts before 1 AM and ends after 6 AM (spans entire night)
      if (startMinutes < nightStart && endMinutes > nightEnd) {
        nightMinutes = nightEnd - nightStart;
      }
      // Case 2: Entry starts before 1 AM and ends during night (1 AM - 6 AM)
      else if (startMinutes < nightStart && endMinutes > nightStart && endMinutes <= nightEnd) {
        nightMinutes = endMinutes - nightStart;
      }
      // Case 3: Entry starts during night and ends after 6 AM
      else if (startMinutes >= nightStart && startMinutes < nightEnd && endMinutes > nightEnd) {
        nightMinutes = nightEnd - startMinutes;
      }
      // Case 4: Entry is entirely within night period
      else if (startMinutes >= nightStart && endMinutes <= nightEnd) {
        nightMinutes = endMinutes - startMinutes;
      }
      // Case 5: Entry spans midnight and includes night hours
      else if (startMinutes > nightEnd && endMinutes > 24 * 60) {
        // Entry started in previous day and ended in next day
        const nextDayEnd = endMinutes - (24 * 60);
        if (nextDayEnd <= nightEnd) {
          nightMinutes = nextDayEnd - nightStart;
        } else {
          nightMinutes = nightEnd - nightStart;
        }
      }
      
      return total + nightMinutes;
    }, 0);
  };

  // Calculate Sunday hours
  const calculateSundayHours = (entries) => {
    return entries.reduce((total, entry) => {
      if (!entry.start_time || !entry.end_time || entry.niet_gewerkt || entry.verlof || entry.ziek || entry.recup) {
        return total;
      }
      
      // Check if the entry date is a Sunday
      const entryDate = new Date(entry.date + 'T00:00:00');
      const dayOfWeek = entryDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      if (dayOfWeek !== 0) {
        return total; // Not a Sunday
      }
      
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      let startMinutes = startParts[0] * 60 + startParts[1];
      let endMinutes = endParts[0] * 60 + endParts[1];
      
      // Handle end time after midnight
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
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
    const startMonth = currentWeekStart.toLocaleDateString('nl-NL', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('nl-NL', { month: 'short' });
    const startYear = currentWeekStart.getFullYear();
    const endYear = weekEnd.getFullYear();
    const weekNumber = getWeekNumber(currentWeekStart);
    
    let dateRange;
    if (startMonth === endMonth && startYear === endYear) {
      dateRange = `${currentWeekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${startYear}`;
    } else if (startYear === endYear) {
      dateRange = `${currentWeekStart.getDate()} ${startMonth} - ${weekEnd.getDate()} ${endMonth} ${startYear}`;
    } else {
      dateRange = `${currentWeekStart.getDate()} ${startMonth} ${startYear} - ${weekEnd.getDate()} ${endMonth} ${endYear}`;
    }
    
    return `Week ${weekNumber} • ${dateRange}`;
  };

  const getWeekTotal = () => {
    return calculateTotalDuration(weekEntries);
  };

  const getMonthStats = () => {
    // Determine which month to use based on view mode
    let statsMonth, statsYear;
    if (viewMode === 'weekly') {
      // When in weekly view, use the month of the current week start
      statsMonth = currentWeekStart.getMonth();
      statsYear = currentWeekStart.getFullYear();
    } else {
      // When in monthly view, use the current month/year states
      statsMonth = currentMonth;
      statsYear = currentYear;
    }
    
    // Get entries for the correct month - ALWAYS use monthEntries, not weekEntries
    // This ensures we get ALL entries for the month, not just the current week
    const firstDay = new Date(statsYear, statsMonth, 1);
    const lastDay = new Date(statsYear, statsMonth + 1, 0);
    
    // Format dates in local timezone
    const firstDayStr = formatDateLocal(firstDay);
    const lastDayStr = formatDateLocal(lastDay);
    
    // Always filter from monthEntries to get ALL entries for the month
    const monthEntriesForStats = monthEntries.filter(entry => {
      return entry.date >= firstDayStr && entry.date <= lastDayStr;
    });
    
    const totalMinutes = calculateTotalDuration(monthEntriesForStats);
    const nightMinutes = calculateNightHours(monthEntriesForStats);
    const sundayMinutes = calculateSundayHours(monthEntriesForStats);
    
    // Only count days that have actual work (not niet_gewerkt, verlof, ziek, or recup)
    const workedDays = new Set(
      monthEntriesForStats
        .filter(entry => {
          // Exclude days with status checkboxes checked
          return !entry.niet_gewerkt && !entry.verlof && !entry.ziek && !entry.recup;
        })
        .map(entry => entry.date)
    ).size;
    const monthName = new Date(statsYear, statsMonth, 1).toLocaleDateString('nl-NL', { month: 'long' });
    
    return {
      totalHours: totalMinutes,
      totalDays: workedDays,
      monthName: monthName,
      nightHours: nightMinutes || 0,
      sundayHours: sundayMinutes || 0
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
      setStartTime(firstEntry.start_time || '');
      setEndTime(firstEntry.end_time || '');
      setComment(firstEntry.comment || '');
      setRechtstreeks(firstEntry.rechtstreeks || false);
      // Set status dropdown based on entry
      if (firstEntry.niet_gewerkt) {
        setStatus('niet_gewerkt');
      } else if (firstEntry.verlof) {
        setStatus('verlof');
      } else if (firstEntry.ziek) {
        setStatus('ziek');
      } else if (firstEntry.recup) {
        setStatus('recup');
      } else {
        setStatus('');
      }
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
      setStatus('');
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
    setStatus('');
    setBonnummer('');
    setSelectedDate(formatDateLocal(new Date()));
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Get user name
    const userName = user?.profile?.full_name || user?.email || 'Onbekend';

    // Header
    doc.setFontSize(18);
    doc.text('Tijdregistratie', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Medewerker: ${userName}`, 14, yPos);
    yPos += 8;

    let entriesToExport, periodTitle, totalMinutes, stats;
    
    if (viewMode === 'weekly') {
      entriesToExport = weekEntries;
      periodTitle = getWeekTitle();
      totalMinutes = getWeekTotal();
      
      // Calculate week stats
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const workedDays = new Set(
        weekEntries
          .filter(entry => !entry.niet_gewerkt && !entry.verlof && !entry.ziek && !entry.recup)
          .map(entry => entry.date)
      ).size;
      
      stats = {
        totalHours: totalMinutes,
        totalDays: workedDays,
        nightHours: calculateNightHours(weekEntries),
        sundayHours: calculateSundayHours(weekEntries)
      };
    } else {
      entriesToExport = monthEntries.filter(entry => {
        const entryDate = new Date(entry.date + 'T00:00:00');
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      });
      periodTitle = new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
      stats = getMonthStats();
      totalMinutes = stats.totalHours;
    }

    doc.setFontSize(11);
    doc.text(`Periode: ${periodTitle}`, 14, yPos);
    yPos += 8;

    // Summary stats
    doc.setFontSize(10);
    doc.text(`Totaal gewerkte uren: ${Math.floor(totalMinutes / 60)}u ${totalMinutes % 60}m`, 14, yPos);
    yPos += 6;
    
    if (viewMode === 'monthly') {
      doc.text(`Totaal gewerkte dagen: ${stats.totalDays}`, 14, yPos);
      yPos += 6;
    }
    
    doc.text(`Nachturen (1:00-6:00): ${Math.floor(stats.nightHours / 60)}u ${stats.nightHours % 60}m`, 14, yPos);
    yPos += 6;
    doc.text(`Zondaguren: ${Math.floor(stats.sundayHours / 60)}u ${stats.sundayHours % 60}m`, 14, yPos);
    yPos += 10;

    // Prepare table data - include ALL days, not just days with entries
    const tableData = [];
    let allDates = [];
    
    if (viewMode === 'weekly') {
      // Get all 7 days of the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        allDates.push(formatDateLocal(date));
      }
    } else {
      // Get all days of the month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      const dates = [];
      const startDate = new Date(firstDay);
      while (startDate <= lastDay) {
        dates.push(formatDateLocal(startDate));
        startDate.setDate(startDate.getDate() + 1);
      }
      allDates = dates;
    }
    
    // Create a map of entries by date for quick lookup
    const entriesByDate = {};
    entriesToExport.forEach(entry => {
      if (!entriesByDate[entry.date]) {
        entriesByDate[entry.date] = [];
      }
      entriesByDate[entry.date].push(entry);
    });
    
    // Process all dates, including those without entries
    allDates.forEach(dateStr => {
      const date = new Date(dateStr + 'T00:00:00');
      const dateFormatted = date.toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: 'short' });
      
      const dayEntries = entriesByDate[dateStr] || [];
      
      if (dayEntries.length === 0) {
        // No entries for this day
        tableData.push([
          dateFormatted,
          '-',
          '-',
          '',
          '',
          'Nee'
        ]);
      } else {
        // Process all entries for this day
        const sortedDayEntries = [...dayEntries].sort((a, b) => {
          return (a.start_time || '').localeCompare(b.start_time || '');
        });
        
        sortedDayEntries.forEach((entry, index) => {
          let status = '';
          if (entry.recup) status = 'Recup';
          else if (entry.verlof) status = 'Verlof';
          else if (entry.ziek) status = 'Ziek';
          else if (entry.niet_gewerkt) status = 'Niet gewerkt';
          
          let timeRange = '';
          let duration = '';
          if (entry.start_time && entry.end_time) {
            timeRange = `${entry.start_time} - ${entry.end_time}`;
            const startParts = entry.start_time.split(':').map(Number);
            const endParts = entry.end_time.split(':').map(Number);
            let startMinutes = startParts[0] * 60 + startParts[1];
            let endMinutes = endParts[0] * 60 + endParts[1];
            if (endMinutes <= startMinutes) {
              endMinutes += 24 * 60;
            }
            const dur = endMinutes - startMinutes;
            duration = `${Math.floor(dur / 60)}u ${dur % 60}m`;
          }
          
          // If multiple entries for same day, only show date on first row
          const displayDate = index === 0 ? dateFormatted : '';
          
          tableData.push([
            displayDate,
            timeRange || status || '-',
            duration || '-',
            entry.comment || '',
            entry.bonnummer || '',
            entry.rechtstreeks ? 'Ja' : 'Nee'
          ]);
        });
      }
    });

    // Add table (always show table, even if empty, since we include all days)
    autoTable(doc, {
      startY: yPos,
      head: [['Datum', 'Tijd/Status', 'Duur', 'Opmerking', 'Bonnummer', 'Rechtstreeks']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 50 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 }
      },
      margin: { left: 14, right: 14 }
    });

    // Generate filename
    const filename = viewMode === 'weekly' 
      ? `tijdregistratie-week-${getWeekNumber(currentWeekStart)}-${currentWeekStart.getFullYear()}.pdf`
      : `tijdregistratie-${new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }).replace(/\s+/g, '-').toLowerCase()}.pdf`;

    doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Er is een fout opgetreden bij het genereren van de PDF. Probeer het opnieuw.');
    }
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
            <button className="close-form-button mobile-only" onClick={handleCancel}>×</button>
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
                <label htmlFor="startTime">Starttijd</label>
                <input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={status !== ''}
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">Eindtijd</label>
                <input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={status !== ''}
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
            <div className="form-group status-row">
              <div className="status-dropdown-wrapper">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setStatus(newStatus);
                    // Clear time entries when a status is selected
                    if (newStatus !== '') {
                      setStartTime('');
                      setEndTime('');
                    }
                  }}
                  className="status-select"
                >
                  <option value="">Geen status</option>
                  <option value="niet_gewerkt">Niet gewerkt</option>
                  <option value="verlof">Verlof</option>
                  <option value="ziek">Ziek</option>
                  <option value="recup">Recup</option>
                </select>
              </div>
              <div className="rechtstreeks-checkbox-wrapper">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rechtstreeks}
                    onChange={(e) => setRechtstreeks(e.target.checked)}
                  />
                  <span>Rechtstreeks</span>
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-button">
                {editingId ? 'Bijwerken' : 'Opslaan'}
              </button>
              <button type="button" onClick={handleCancel} className="cancel-button">
                Annuleren
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
                >
                  🗑️
                </button>
              )}
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
              <button onClick={() => navigateWeek(-1)} className="nav-button nav-arrow">
                ←
              </button>
              <button onClick={goToCurrentWeek} className="nav-button today">
                Huidige Week
              </button>
              <button onClick={() => navigateWeek(1)} className="nav-button nav-arrow">
                →
              </button>
            </div>
            <div className="header-actions">
              <button className="export-button" onClick={exportToPDF} title="Exporteer als PDF">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="add-entry-button" onClick={handleAddNew} title="Nieuw item toevoegen">
                +
              </button>
            </div>
          </div>
          <div className="week-title">{getWeekTitle()}</div>
          <div className="week-total">
            Totaal: {Math.floor(getWeekTotal() / 60)}u {getWeekTotal() % 60}m
          </div>
          <div className="statistics-section">
            <div className="stat-card">
              <div className="stat-label">Totaal gewerkte uren in Week {getWeekNumber(currentWeekStart)}</div>
              <div className="stat-value">{Math.floor(getWeekTotal() / 60)}u {getWeekTotal() % 60}m</div>
            </div>
            {(() => {
              // Get the month of the week being viewed
              const weekMonth = currentWeekStart.getMonth();
              const weekYear = currentWeekStart.getFullYear();
              const weekMonthName = new Date(weekYear, weekMonth, 1).toLocaleDateString('nl-NL', { month: 'long' });
              
              // Calculate stats for the week's month
              const weekMonthFirstDay = new Date(weekYear, weekMonth, 1);
              const weekMonthLastDay = new Date(weekYear, weekMonth + 1, 0);
              const weekMonthEntries = weekEntries.filter(entry => {
                const entryDate = new Date(entry.date + 'T00:00:00');
                return entryDate >= weekMonthFirstDay && entryDate <= weekMonthLastDay;
              });
              
              const weekMonthMinutes = calculateTotalDuration(weekMonthEntries);
              const weekMonthWorkedDays = new Set(
                weekMonthEntries
                  .filter(entry => !entry.niet_gewerkt && !entry.verlof && !entry.ziek && !entry.recup)
                  .map(entry => entry.date)
              ).size;
              
              return (
                <>
                  <div className="stat-card">
                    <div className="stat-label">Totaal gewerkte dagen in {weekMonthName}</div>
                    <div className="stat-value">{weekMonthWorkedDays} {weekMonthWorkedDays === 1 ? 'dag' : 'dagen'}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Totaal gewerkte uren in {weekMonthName}</div>
                    <div className="stat-value">{Math.floor(weekMonthMinutes / 60)}u {weekMonthMinutes % 60}m</div>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="week-calendar">
            {getWeekDates().map((date, index) => {
              const dateEntries = getEntriesForDate(date);
              const totalMinutes = getTotalForDate(date);
              const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
              const dayNumber = date.getDate();
              const monthAbbr = date.toLocaleDateString('nl-NL', { month: 'short' }).toUpperCase();
              const isCurrentDay = isToday(date);
              const isSelectedDay = isSelected(date);
              const firstEntry = dateEntries.length > 0 ? dateEntries[0] : null;
              const statusClass = firstEntry ? 
                (firstEntry.verlof ? 'status-verlof' : 
                 firstEntry.ziek ? 'status-ziek' : 
                 firstEntry.niet_gewerkt ? 'status-niet-gewerkt' : 
                 firstEntry.recup ? 'status-recup' : 
                 'status-gewerkt') : '';

              return (
                <div
                  key={index}
                  className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelectedDay ? 'selected' : ''} ${statusClass} clickable`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="day-header">
                    <div className="day-name">{dayName} - {dayNumber} {monthAbbr}</div>
                    <div className="day-number" style={{ display: 'none' }}>{dayNumber}</div>
                  </div>
                  <div className="day-entries">
                    {dateEntries.length > 0 ? (
                      <>
                        {(() => {
                          const firstEntry = dateEntries[0];
                          const hasStatus = firstEntry.niet_gewerkt || firstEntry.verlof || firstEntry.ziek || firstEntry.recup;
                          const statusClass = firstEntry.verlof ? 'status-verlof' : 
                                            firstEntry.ziek ? 'status-ziek' : 
                                            firstEntry.niet_gewerkt ? 'status-niet-gewerkt' : 
                                            firstEntry.recup ? 'status-recup' : 
                                            'status-gewerkt';
                          
                          // Determine display text - check recup FIRST, then other statuses, then time ranges
                          // "Gewerkt" should never be shown as text - it's only a green colored state
                          let displayText = '';
                          if (firstEntry.recup) {
                            displayText = 'Recup';
                          } else if (firstEntry.verlof) {
                            displayText = 'Verlof';
                          } else if (firstEntry.ziek) {
                            displayText = 'Ziek';
                          } else if (firstEntry.niet_gewerkt) {
                            displayText = 'Niet gewerkt';
                          } else if (firstEntry.start_time && firstEntry.end_time) {
                            displayText = `${firstEntry.start_time.substring(0, 5)} - ${firstEntry.end_time.substring(0, 5)}`;
                          }
                          // If no display text, don't show anything (the green color from statusClass will indicate "gewerkt")
                          
                          return (
                            <>
                              {displayText && (
                                <div className={`day-status ${statusClass}`}>
                                  {displayText}
                                </div>
                              )}
                              {!hasStatus && firstEntry.start_time && firstEntry.end_time && (
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
              <button onClick={() => navigateMonth(-1)} className="nav-button nav-arrow">
                ←
              </button>
              <button onClick={goToCurrentMonth} className="nav-button today">
                Huidige Maand
              </button>
              <button onClick={() => navigateMonth(1)} className="nav-button nav-arrow">
                →
              </button>
            </div>
            <div className="header-actions">
              <button className="export-button" onClick={exportToPDF} title="Exporteer als PDF">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="add-entry-button" onClick={handleAddNew} title="Nieuw item toevoegen">
                +
              </button>
            </div>
          </div>
          <div className="month-title">
            {new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
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
            <div className="stat-card">
              <div className="stat-label">Nachturen (1:00 - 6:00)</div>
              <div className="stat-value">
                {(() => {
                  const stats = getMonthStats();
                  const hours = Math.floor(stats.nightHours / 60);
                  const minutes = stats.nightHours % 60;
                  if (stats.nightHours === 0) {
                    return '0u 0m';
                  }
                  return `${hours}u ${minutes}m`;
                })()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Zondaguren</div>
              <div className="stat-value">
                {(() => {
                  const stats = getMonthStats();
                  const hours = Math.floor(stats.sundayHours / 60);
                  const minutes = stats.sundayHours % 60;
                  if (stats.sundayHours === 0) {
                    return '0u 0m';
                  }
                  return `${hours}u ${minutes}m`;
                })()}
              </div>
            </div>
          </div>
          <div className="month-calendar">
            {getMonthDates().map((date, index) => {
              const dateEntries = getEntriesForDate(date);
              const totalMinutes = getTotalForDate(date);
              const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
              const dayNumber = date.getDate();
              const monthAbbr = date.toLocaleDateString('nl-NL', { month: 'short' }).toUpperCase();
              const isCurrentDay = isToday(date);

              const firstEntry = dateEntries.length > 0 ? dateEntries[0] : null;
              const statusClass = firstEntry ? 
                (firstEntry.verlof ? 'status-verlof' : 
                 firstEntry.ziek ? 'status-ziek' : 
                 firstEntry.niet_gewerkt ? 'status-niet-gewerkt' : 
                 firstEntry.recup ? 'status-recup' : 
                 'status-gewerkt') : '';

              return (
                <div
                  key={index}
                  className={`month-calendar-day ${isCurrentDay ? 'today' : ''} ${dateEntries.length > 0 ? 'has-entries' : ''} ${statusClass} clickable`}
                  onClick={() => handleDateClick(date)}
                >
                  <div className="day-header">
                    <div className="day-name">{dayName} - {dayNumber} {monthAbbr}</div>
                    <div className="day-number" style={{ display: 'none' }}>{dayNumber}</div>
                  </div>
                  <div className="day-entries">
                    {dateEntries.length > 0 ? (
                      <>
                        {(() => {
                          // Re-get firstEntry inside IIFE to ensure we have the latest reference
                          const entry = dateEntries[0];
                          if (!entry) return null;
                          
                          const hasStatus = entry.niet_gewerkt || entry.verlof || entry.ziek || entry.recup;
                          
                          // Determine display text - check recup FIRST, then other statuses, then time ranges
                          // "Gewerkt" should never be shown as text - it's only a green colored state
                          let displayText = '';
                          if (entry.recup === true || entry.recup === 'true' || entry.recup === 1) {
                            displayText = 'Recup';
                          } else if (entry.verlof === true || entry.verlof === 'true' || entry.verlof === 1) {
                            displayText = 'Verlof';
                          } else if (entry.ziek === true || entry.ziek === 'true' || entry.ziek === 1) {
                            displayText = 'Ziek';
                          } else if (entry.niet_gewerkt === true || entry.niet_gewerkt === 'true' || entry.niet_gewerkt === 1) {
                            displayText = 'Niet gewerkt';
                          } else if (entry.start_time && entry.end_time) {
                            displayText = `${entry.start_time.substring(0, 5)} - ${entry.end_time.substring(0, 5)}`;
                          }
                          // If no display text, don't show anything (the green color from statusClass will indicate "gewerkt")
                          
                          return (
                            <>
                              {displayText && (
                                <div className={`day-status ${statusClass}`}>
                                  {displayText}
                                </div>
                              )}
                              {!hasStatus && entry.start_time && entry.end_time && (
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
    </div>
  );
};

export default Timeline;

