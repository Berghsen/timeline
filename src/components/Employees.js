import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Employees.css';

// Helper function to make API calls - works both locally (with proxy) and on Vercel
const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Get response as text first to handle both JSON and errors
  const responseText = await response.text();
  
  // Check if response is HTML (means it hit the React app instead of API)
  if (responseText.trim().startsWith('<!')) {
    throw new Error(`API endpoint not found: ${url}. Check Vercel function deployment.`);
  }

  // Try to parse as JSON
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch (e) {
    console.error('Failed to parse response as JSON:', e);
    console.error('Response text:', responseText.substring(0, 200));
    throw new Error(`Server returned invalid JSON: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    const errorMessage = data?.error || `Request failed: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return data;
};

const Employees = () => {
  const { supabase } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [viewMode, setViewMode] = useState('monthly'); // 'weekly' or 'monthly'
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
      console.log('Selected employee changed, fetching entries for:', selectedEmployee.id, selectedEmployee.email);
      fetchEmployeeEntries(selectedEmployee.id);
      setTravelTime(selectedEmployee.travel_time_minutes || 0);
    } else {
      console.log('No employee selected, clearing entries');
      setTimeEntries([]);
    }
  }, [selectedEmployee, currentWeekStart, currentMonth, currentYear, viewMode]);

  // Set the first employee (oldest) as selected by default when employees are first loaded
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees.length]); // Only run when employees list length changes (initial load)

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const data = await apiFetch('/api/admin/employees', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const employeesList = Array.isArray(data) ? data : [];
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      alert(`Fout bij het laden van medewerkers: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeEntries = async (employeeId) => {
    if (!employeeId) {
      console.error('No employee ID provided');
      setTimeEntries([]);
      return;
    }

    setEntriesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        setTimeEntries([]);
        return;
      }

      console.log('Fetching time entries for employee:', employeeId);
      const data = await apiFetch(`/api/admin/employees/time-entries?employeeId=${employeeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('Fetched time entries:', data);
      setTimeEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setTimeEntries([]);
      // Don't show alert for time entries as it might be expected if employee has no entries
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setViewMode('monthly');
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

      const updatedEmployee = await apiFetch(`/api/admin/employees/travel-time?employeeId=${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ travel_time_minutes: travelTimeValue }),
      });
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
      if (!entry.start_time || !entry.end_time) {
        return total;
      }
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      let duration = endMinutes - startMinutes;
      if (duration <= 0) {
        duration += 24 * 60;
      }
      return total + duration;
    }, 0);
    
    return {
      total: totalMinutes,
      afterTravel: totalMinutes
    };
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

  const calculateTotalHours = () => {
    return timeEntries.reduce((total, entry) => {
      if (!entry.start_time || !entry.end_time) {
        return total;
      }
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      let duration = endMinutes - startMinutes;
      if (duration <= 0) {
        duration += 24 * 60;
      }
      return total + duration;
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
      if (startMinutes < nightStart && endMinutes > nightEnd) {
        nightMinutes = nightEnd - nightStart;
      } else if (startMinutes < nightStart && endMinutes > nightStart && endMinutes <= nightEnd) {
        nightMinutes = endMinutes - nightStart;
      } else if (startMinutes >= nightStart && startMinutes < nightEnd && endMinutes > nightEnd) {
        nightMinutes = nightEnd - startMinutes;
      } else if (startMinutes >= nightStart && endMinutes <= nightEnd) {
        nightMinutes = endMinutes - startMinutes;
      } else if (startMinutes > nightEnd && endMinutes > 24 * 60) {
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

  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const exportToPDF = () => {
    if (!selectedEmployee) {
      alert('Selecteer eerst een medewerker om te exporteren.');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Get employee name
      const employeeName = selectedEmployee.full_name || selectedEmployee.email || 'Onbekend';

      // Header
      doc.setFontSize(18);
      doc.text('Tijdregistratie', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.text(`Medewerker: ${employeeName}`, 14, yPos);
      yPos += 8;

      let entriesToExport, periodTitle, totalMinutes, stats;
      let allDates = [];
      
      if (viewMode === 'weekly') {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekStartStr = formatDateLocal(currentWeekStart);
        const weekEndStr = formatDateLocal(weekEnd);
        
        entriesToExport = timeEntries.filter(entry => {
          return entry.date >= weekStartStr && entry.date <= weekEndStr;
        });
        
        periodTitle = getWeekTitle();
        const totals = getWeekTotals();
        totalMinutes = totals.total;
        
        // Get all 7 days of the week
        for (let i = 0; i < 7; i++) {
          const date = new Date(currentWeekStart);
          date.setDate(date.getDate() + i);
          allDates.push(formatDateLocal(date));
        }
        
        stats = {
          totalHours: totalMinutes,
          totalDays: totals.totalDays || 0,
          nightHours: calculateNightHours(entriesToExport),
          sundayHours: calculateSundayHours(entriesToExport)
        };
      } else {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const firstDayStr = formatDateLocal(firstDay);
        const lastDayStr = formatDateLocal(lastDay);
        
        entriesToExport = timeEntries.filter(entry => {
          return entry.date >= firstDayStr && entry.date <= lastDayStr;
        });
        
        periodTitle = new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
        const totals = getMonthTotals();
        totalMinutes = totals.totalHours || 0;
        stats = totals;
        
        // Get all days of the month
        const startDate = new Date(firstDay);
        while (startDate <= lastDay) {
          allDates.push(formatDateLocal(startDate));
          startDate.setDate(startDate.getDate() + 1);
        }
      }

      doc.setFontSize(11);
      doc.text(`Periode: ${periodTitle}`, 14, yPos);
      yPos += 8;

      // Summary stats
      doc.setFontSize(10);
      doc.text(`Totaal gewerkte uren: ${Math.floor(totalMinutes / 60)}u ${totalMinutes % 60}m`, 14, yPos);
      yPos += 6;
      
      if (viewMode === 'monthly') {
        doc.text(`Totaal gewerkte dagen: ${stats.totalDays || 0}`, 14, yPos);
        yPos += 6;
      }
      
      doc.text(`Nachturen (1:00-6:00): ${Math.floor((stats.nightHours || 0) / 60)}u ${(stats.nightHours || 0) % 60}m`, 14, yPos);
      yPos += 6;
      doc.text(`Zondaguren: ${Math.floor((stats.sundayHours || 0) / 60)}u ${(stats.sundayHours || 0) % 60}m`, 14, yPos);
      yPos += 10;

      // Prepare table data - include ALL days
      const tableData = [];
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
          tableData.push([
            dateFormatted,
            '-',
            '-',
            '',
            '',
            'Nee'
          ]);
        } else {
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

      // Add table
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
        ? `tijdregistratie-${employeeName.replace(/\s+/g, '-')}-week-${getWeekNumber(currentWeekStart)}-${currentWeekStart.getFullYear()}.pdf`
        : `tijdregistratie-${employeeName.replace(/\s+/g, '-')}-${new Date(currentYear, currentMonth, 1).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }).replace(/\s+/g, '-').toLowerCase()}.pdf`;

      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Er is een fout opgetreden bij het genereren van de PDF. Probeer het opnieuw.');
    }
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
    const startMonth = currentWeekStart.toLocaleDateString('nl-NL', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('nl-NL', { month: 'short' });
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

  // Helper function to format date in local timezone (fixes timezone bug)
  const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEntriesForDate = (date) => {
    const dateStr = formatDateLocal(date);
    return timeEntries.filter(entry => entry.date === dateStr);
  };

  const getTotalForDate = (date) => {
    const dateEntries = getEntriesForDate(date);
    const totalMinutes = dateEntries.reduce((total, entry) => {
      if (!entry.start_time || !entry.end_time) {
        return total;
      }
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      let duration = endMinutes - startMinutes;
      if (duration <= 0) {
        duration += 24 * 60;
      }
      return total + duration;
    }, 0);
    return totalMinutes;
  };

  const getWeekTotals = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Format dates in local timezone to avoid timezone issues
    const weekStartStr = formatDateLocal(currentWeekStart);
    const weekEndStr = formatDateLocal(weekEnd);
    
    const weekEntries = timeEntries.filter(entry => {
      // Compare date strings directly to avoid timezone issues
      return entry.date >= weekStartStr && entry.date <= weekEndStr;
    });
    return calculateHoursWithTravelTime(weekEntries);
  };

  const getMonthTotals = () => {
    // Determine which month to use based on view mode (same logic as getMonthStats)
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
    
    const firstDay = new Date(statsYear, statsMonth, 1);
    const lastDay = new Date(statsYear, statsMonth + 1, 0);
    
    // Format dates in local timezone for string comparison (avoids timezone issues)
    const firstDayStr = formatDateLocal(firstDay);
    const lastDayStr = formatDateLocal(lastDay);
    
    // Filter entries using string comparison to avoid timezone issues
    const monthEntries = timeEntries.filter(entry => {
      return entry.date >= firstDayStr && entry.date <= lastDayStr;
    });
    return calculateHoursWithTravelTime(monthEntries);
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
    
    const firstDay = new Date(statsYear, statsMonth, 1);
    const lastDay = new Date(statsYear, statsMonth + 1, 0);
    
    // Format dates in local timezone for comparison
    const firstDayStr = formatDateLocal(firstDay);
    const lastDayStr = formatDateLocal(lastDay);
    
    // Filter entries for the correct month using string comparison
    const monthEntries = timeEntries.filter(entry => {
      return entry.date >= firstDayStr && entry.date <= lastDayStr;
    });
    
    // Calculate totals
    const totalMinutes = monthEntries.reduce((total, entry) => {
      if (!entry.start_time || !entry.end_time || entry.niet_gewerkt || entry.verlof || entry.ziek || entry.recup) {
        return total;
      }
      const startParts = entry.start_time.split(':').map(Number);
      const endParts = entry.end_time.split(':').map(Number);
      let startMinutes = startParts[0] * 60 + startParts[1];
      let endMinutes = endParts[0] * 60 + endParts[1];
      let duration = endMinutes - startMinutes;
      if (duration <= 0) {
        duration += 24 * 60;
      }
      return total + duration;
    }, 0);
    
    const nightMinutes = calculateNightHours(monthEntries);
    const sundayMinutes = calculateSundayHours(monthEntries);
    
    // Only count days that have actual work (not niet_gewerkt, verlof, ziek, or recup)
    const workedDays = new Set(
      monthEntries
        .filter(entry => {
          // Exclude days with status selected
          return !entry.niet_gewerkt && !entry.verlof && !entry.ziek && !entry.recup;
        })
        .map(entry => entry.date)
    ).size;
    const monthName = new Date(statsYear, statsMonth, 1).toLocaleDateString('nl-NL', { month: 'long' });
    
    return {
      totalDays: workedDays,
      totalHours: totalMinutes || 0,
      nightHours: nightMinutes || 0,
      sundayHours: sundayMinutes || 0,
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
      <h1>Medewerkers</h1>
      
      <div className="employees-content">
        <div className="employees-list-section">
          <h2>Alle Medewerkers</h2>
          {loading ? (
            <div className="loading">Medewerkers laden...</div>
          ) : employees.length === 0 ? (
            <div className="no-data">Geen medewerkers gevonden</div>
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
                    Week
                  </button>
                  <button
                    className={`view-mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                    onClick={() => setViewMode('monthly')}
                  >
                    Maand
                  </button>
                </div>
              </div>

              
              {entriesLoading ? (
                <div className="loading">Items laden...</div>
              ) : timeEntries.length === 0 ? (
                <div className="no-data">
                  Geen tijditems voor deze medewerker
                  {selectedEmployee && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                      (Employee ID: {selectedEmployee.id})
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {viewMode === 'weekly' ? (
                    <div className="calendar-view">
                      <div className="weekly-header">
                        <div className="week-title">{getWeekTitle()}</div>
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
                          </div>
                      </div>
                      <div className="week-totals">
                        <div className="total-item">
                          <span className="total-label">Gewerkte uren deze week:</span>
                          <span className="total-value">
                            {(() => {
                              const totals = getWeekTotals();
                              return `${Math.floor(totals.total / 60)}u ${totals.total % 60}m`;
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

                          const dateStr = formatDateLocal(date);
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
                              className={`calendar-day ${isCurrentDay ? 'today' : ''} ${dateEntries.length > 0 ? 'clickable' : ''} ${statusClass}`}
                              onClick={() => dateEntries.length > 0 && setSelectedDate(dateStr)}
                            >
                              <div className="day-header">
                                <div className="day-name">{dayName}</div>
                                <div className="day-number">{dayNumber}</div>
                              </div>
                              <div className="day-entries">
                                {dateEntries.length > 0 ? (
                                  <>
                                    {(() => {
                                      const hasStatus = firstEntry.niet_gewerkt || firstEntry.verlof || firstEntry.ziek || firstEntry.recup;
                                      
                                      // Determine display text - check recup FIRST to ensure it takes priority
                                      let displayText = 'Gewerkt';
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
                                      
                                      return (
                                        <>
                                          <div className={`day-status ${statusClass}`}>
                                            {displayText}
                                          </div>
                                          {!hasStatus && (
                                            <div className="day-total">
                                              {Math.floor(totalMinutes / 60)}u {totalMinutes % 60}m
                                            </div>
                                          )}
                                          {dateEntries.some(e => e.rechtstreeks) && (
                                            <div className="rechtstreeks-indicator" style={{ 
                                              fontSize: '0.7rem', 
                                              color: '#22543d', 
                                              marginTop: '0.25rem',
                                              fontWeight: '500'
                                            }}>
                                              ✓ Rechtstreeks
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
                                  <div className="day-empty">Geen items</div>
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
                        </div>
                      </div>
                      <div className="month-totals">
                        <div className="total-item">
                          <span className="total-label">Gewerkte uren deze maand:</span>
                          <span className="total-value">
                            {(() => {
                              const totals = getMonthTotals();
                              return `${Math.floor(totals.total / 60)}u ${totals.total % 60}m`;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="month-stats">
                        <div className="stat-card">
                          <div className="stat-label">Gewerkte dagen in {getMonthStats().monthName}</div>
                          <div className="stat-value">{getMonthStats().totalDays} {getMonthStats().totalDays === 1 ? 'dag' : 'dagen'}</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-label">Totaal gewerkte uren in {getMonthStats().monthName}</div>
                          <div className="stat-value">
                            {(() => {
                              const stats = getMonthStats();
                              const hours = Math.floor(stats.totalHours / 60);
                              const minutes = stats.totalHours % 60;
                              if (stats.totalHours === 0) {
                                return '0u 0m';
                              }
                              return `${hours}u ${minutes}m`;
                            })()}
                          </div>
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
                          const rawTotal = dateEntries.reduce((total, entry) => {
                            if (!entry.start_time || !entry.end_time) {
                              return total;
                            }
                            const startParts = entry.start_time.split(':').map(Number);
                            const endParts = entry.end_time.split(':').map(Number);
                            const startMinutes = startParts[0] * 60 + startParts[1];
                            const endMinutes = endParts[0] * 60 + endParts[1];
                            let duration = endMinutes - startMinutes;
                            if (duration <= 0) {
                              duration += 24 * 60;
                            }
                            return total + duration;
                          }, 0);
                          const netMinutes = rawTotal;
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayNumber = date.getDate();
                          const isCurrentDay = isToday(date);
                          const dateStr = formatDateLocal(date);

                          const firstEntryForClass = dateEntries.length > 0 ? dateEntries[0] : null;
                          const dayStatusClass = firstEntryForClass ? 
                            (firstEntryForClass.verlof ? 'status-verlof' : 
                             firstEntryForClass.ziek ? 'status-ziek' : 
                             firstEntryForClass.niet_gewerkt ? 'status-niet-gewerkt' : 
                             firstEntryForClass.recup ? 'status-recup' : 
                             'status-gewerkt') : '';
                          
                          return (
                            <div 
                              key={index} 
                              className={`month-calendar-day ${isCurrentDay ? 'today' : ''} ${dateEntries.length > 0 ? 'has-entries clickable' : ''} ${dayStatusClass}`}
                              onClick={() => dateEntries.length > 0 && setSelectedDate(dateStr)}
                            >
                              <div className="day-header">
                                <div className="day-name">{dayName}</div>
                                <div className="day-number">{dayNumber}</div>
                              </div>
                              <div className="day-entries">
                                {dateEntries.length > 0 ? (
                                  <>
                                    {(() => {
                                      // Use the same firstEntryForClass that's used for the color (which works)
                                      const entry = firstEntryForClass;
                                      if (!entry) return null;
                                      
                                      const hasStatus = entry.niet_gewerkt || entry.verlof || entry.ziek || entry.recup;
                                      const statusClass = entry.verlof ? 'status-verlof' : 
                                                        entry.ziek ? 'status-ziek' : 
                                                        entry.niet_gewerkt ? 'status-niet-gewerkt' : 
                                                        entry.recup ? 'status-recup' : 
                                                        'status-gewerkt';
                                      
                                      // Determine display text - use EXACT same variable and logic as statusClass
                                      let displayText = 'Gewerkt';
                                      if (entry.recup) {
                                        displayText = 'Recup';
                                      } else if (entry.verlof) {
                                        displayText = 'Verlof';
                                      } else if (entry.ziek) {
                                        displayText = 'Ziek';
                                      } else if (entry.niet_gewerkt) {
                                        displayText = 'Niet gewerkt';
                                      } else if (entry.start_time && entry.end_time) {
                                        displayText = `${entry.start_time.substring(0, 5)} - ${entry.end_time.substring(0, 5)}`;
                                      }
                                      
                                      return (
                                        <>
                                          <div className={`day-status ${statusClass}`}>
                                            {displayText}
                                          </div>
                                          {!hasStatus && (
                                            <div className="day-total">
                                              {Math.floor(netMinutes / 60)}u {netMinutes % 60}m
                                            </div>
                                          )}
                                          {dateEntries.some(e => e.rechtstreeks) && (
                                            <div className="rechtstreeks-indicator" style={{ 
                                              fontSize: '0.7rem', 
                                              color: '#22543d', 
                                              marginTop: '0.25rem',
                                              fontWeight: '500'
                                            }}>
                                              ✓ Rechtstreeks
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
                </>
              )}
            </>
          ) : (
            <div className="no-selection">
              Selecteer een medewerker om hun tijdregistraties te bekijken
            </div>
          )}
        </div>
      </div>

      {selectedDate && (
        <div className="date-detail-modal" onClick={() => setSelectedDate(null)}>
          <div className="date-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="date-detail-header">
              <h3>{new Date(selectedDate).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <button className="close-button" onClick={() => setSelectedDate(null)}>×</button>
            </div>
            <div className="date-detail-entries">
              {timeEntries.filter(entry => entry.date === selectedDate).map((entry) => {
                let duration = 0;
                if (entry.start_time && entry.end_time) {
                  const startParts = entry.start_time.split(':').map(Number);
                  const endParts = entry.end_time.split(':').map(Number);
                  let startMinutes = startParts[0] * 60 + startParts[1];
                  let endMinutes = endParts[0] * 60 + endParts[1];
                  
                  // Handle end time after midnight
                  if (endMinutes <= startMinutes) {
                    endMinutes += 24 * 60;
                  }
                  duration = endMinutes - startMinutes;
                }

                return (
                  <div key={entry.id} className="date-detail-entry">
                    <div className="detail-entry-header">
                      {entry.start_time && entry.end_time && (
                        <>
                          <div className="detail-time">
                            <strong>{entry.start_time} - {entry.end_time}</strong>
                          </div>
                          <div className="detail-duration">
                            {Math.floor(duration / 60)}u {duration % 60}m
                          </div>
                        </>
                      )}
                    </div>
                    {entry.bonnummer && (
                      <div className="detail-field">
                        <strong>Bonnummer:</strong> {entry.bonnummer}
                      </div>
                    )}
                    {entry.rechtstreeks && (
                      <div className="detail-rechtstreeks" style={{ 
                        background: '#e6ffed', 
                        padding: '0.5rem', 
                        borderRadius: '4px', 
                        marginTop: '0.5rem',
                        color: '#22543d',
                        fontWeight: '500'
                      }}>
                        ✓ Rechtstreeks
                      </div>
                    )}
                    {entry.comment && (
                      <div className="detail-comment">
                        <strong>Opmerking:</strong> {entry.comment}
                      </div>
                    )}
                    {entry.niet_gewerkt && (
                      <div className="detail-field">
                        <strong>Niet gewerkt</strong>
                      </div>
                    )}
                    {entry.verlof && (
                      <div className="detail-field">
                        <strong>Verlof</strong>
                      </div>
                    )}
                    {entry.ziek && (
                      <div className="detail-field">
                        <strong>Ziek</strong>
                      </div>
                    )}
                    <div className="detail-meta">
                      <span>Aangemaakt: {new Date(entry.created_at).toLocaleString('nl-NL')}</span>
                      {entry.updated_at !== entry.created_at && (
                        <span>Bijgewerkt: {new Date(entry.updated_at).toLocaleString('nl-NL')}</span>
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