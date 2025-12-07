import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AbsenceCertificates.css';

const AbsenceCertificates = ({ isAdmin = false }) => {
  const { supabase, user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchEmployees();
    }
    fetchCertificates();
  }, [isAdmin, selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .neq('role', 'admin')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('absence_certificates')
        .select('*, user_profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (isAdmin && selectedEmployee) {
        query = query.eq('user_id', selectedEmployee.id);
      } else if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCertificates(data || []);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setFileError('');
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setFileError('Alleen JPG, JPEG, PNG of PDF bestanden zijn toegestaan');
      setSelectedFile(null);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('Bestand is te groot. Maximum grootte is 10MB');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setFileError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setFileError('Selecteer een bestand');
      return;
    }

    if (!startDate || !endDate) {
      setFileError('Selecteer een start- en einddatum');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFileError('Einddatum moet na of gelijk zijn aan startdatum');
      return;
    }

    setUploading(true);
    setFileError('');

    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('absence-certificates')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('absence-certificates')
        .getPublicUrl(fileName);

      // Insert certificate record
      const { error: insertError } = await supabase
        .from('absence_certificates')
        .insert({
          user_id: user.id,
          start_date: startDate,
          end_date: endDate,
          comment: comment || null,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type
        });

      if (insertError) throw insertError;

      // Reset form
      setStartDate('');
      setEndDate('');
      setComment('');
      setSelectedFile(null);
      setShowUploadForm(false);
      document.getElementById('file-input').value = '';

      // Refresh certificates
      fetchCertificates();
    } catch (err) {
      console.error('Error uploading certificate:', err);
      setFileError(err.message || 'Fout bij het uploaden van het attest');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, fileUrl) => {
    if (!window.confirm('Weet u zeker dat u dit attest wilt verwijderen?')) {
      return;
    }

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts.slice(-2).join('/'); // Get user_id/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('absence-certificates')
        .remove([fileName]);

      if (storageError) console.error('Error deleting file:', storageError);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('absence_certificates')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      fetchCertificates();
    } catch (err) {
      console.error('Error deleting certificate:', err);
      alert('Fout bij het verwijderen van het attest');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysBetween = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="absence-certificates-container">
      <div className="absence-certificates-header">
        <h1>Afwezigheidsattesten</h1>
        {!isAdmin && (
          <button
            className="upload-button"
            onClick={() => setShowUploadForm(!showUploadForm)}
          >
            {showUploadForm ? 'Annuleren' : '+ Nieuw Attest Uploaden'}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="employee-selector">
          <label htmlFor="employee-select">Selecteer medewerker:</label>
          <select
            id="employee-select"
            value={selectedEmployee?.id || ''}
            onChange={(e) => {
              const emp = employees.find(em => em.id === e.target.value);
              setSelectedEmployee(emp || null);
            }}
          >
            <option value="">Alle medewerkers</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name || emp.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {!isAdmin && showUploadForm && (
        <div className="upload-form-container">
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-group">
              <label htmlFor="start-date">Startdatum *</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end-date">Einddatum *</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="comment">Opmerking</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="3"
                placeholder="Optionele opmerking..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="file-input">Attest bestand * (JPG, PNG of PDF, max 10MB)</label>
              <input
                id="file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                required
              />
              {selectedFile && (
                <div className="file-info">
                  Geselecteerd: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
              {fileError && <div className="error-message">{fileError}</div>}
            </div>

            <div className="form-actions">
              <button type="submit" disabled={uploading} className="submit-button">
                {uploading ? 'Uploaden...' : 'Uploaden'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Attesten laden...</div>
      ) : certificates.length === 0 ? (
        <div className="no-certificates">
          {isAdmin && !selectedEmployee
            ? 'Geen attesten gevonden'
            : isAdmin && selectedEmployee
            ? `Geen attesten gevonden voor ${selectedEmployee.full_name || selectedEmployee.email}`
            : 'Nog geen attesten geüpload'}
        </div>
      ) : (
        <div className="certificates-list">
          {certificates.map((cert) => (
            <div key={cert.id} className="certificate-card">
              <div className="certificate-header">
                <div className="certificate-info">
                  <h3>
                    {isAdmin && cert.user_profiles
                      ? cert.user_profiles.full_name || cert.user_profiles.email
                      : 'Mijn Attest'}
                  </h3>
                  <div className="certificate-dates">
                    {cert.start_date === cert.end_date
                      ? formatDate(cert.start_date)
                      : `${formatDate(cert.start_date)} - ${formatDate(cert.end_date)}`}
                    <span className="days-count">
                      ({getDaysBetween(cert.start_date, cert.end_date)} {getDaysBetween(cert.start_date, cert.end_date) === 1 ? 'dag' : 'dagen'})
                    </span>
                  </div>
                  {cert.comment && (
                    <div className="certificate-comment">{cert.comment}</div>
                  )}
                  <div className="certificate-meta">
                    Geüpload op: {new Date(cert.created_at).toLocaleDateString('nl-NL')}
                  </div>
                </div>
                {!isAdmin && (
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(cert.id, cert.file_url)}
                  >
                    Verwijderen
                  </button>
                )}
              </div>
              <div className="certificate-file">
                <a
                  href={cert.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-link"
                >
                  📄 {cert.file_name}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AbsenceCertificates;

