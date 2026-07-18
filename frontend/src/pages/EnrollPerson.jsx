import React, { useState } from 'react';
import { api } from '../api/api';

export default function EnrollPerson() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    last_seen_date: '',
    last_seen_location: '',
    complainant_name: '',
    complainant_contact: ''
  });
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setSuccess(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setError("Please upload a photograph of the missing person.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const submissionData = new FormData();
    submissionData.append('name', formData.name);
    submissionData.append('age', parseInt(formData.age));
    submissionData.append('gender', formData.gender);
    submissionData.append('last_seen_date', formData.last_seen_date);
    submissionData.append('last_seen_location', formData.last_seen_location);
    submissionData.append('complainant_name', formData.complainant_name);
    submissionData.append('complainant_contact', formData.complainant_contact);
    submissionData.append('photo', photo);

    try {
      const result = await api.enrollPerson(submissionData);
      setSuccess(`Successfully enrolled ${result.name}! Face detected and 128-d embedding generated.`);
      // Reset form
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
        last_seen_date: '',
        last_seen_location: '',
        complainant_name: '',
        complainant_contact: ''
      });
      setPhoto(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "An error occurred while enrolling the missing person.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-dark)' }}>
              Enroll Missing Person
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Register basic information and photo. Face embedding will be generated automatically.
            </p>
          </div>
          <span style={{ fontSize: '1.8rem' }}>📝</span>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontWeight: '600',
            fontSize: '0.9rem',
            border: '1px solid rgba(229, 62, 98, 0.15)'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success-text)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontWeight: '600',
            fontSize: '0.9rem',
            border: '1px solid rgba(56, 178, 172, 0.15)'
          }}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Left Column: Photo Upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
              <div style={{
                width: '200px',
                height: '240px',
                borderRadius: '16px',
                border: '2px dashed #CBD5E0',
                backgroundColor: '#FFFDF9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '16px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>👤</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>No Photo Uploaded</div>
                  </div>
                )}
              </div>

              <div style={{ width: '100%', textAlign: 'center' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="photo-upload" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
                <label 
                  htmlFor="photo-upload" 
                  className="btn-secondary" 
                  style={{ 
                    display: 'inline-flex',
                    cursor: 'pointer',
                    width: '100%',
                    justifyContent: 'center',
                    boxSizing: 'border-box'
                  }}
                >
                  📸 Upload Portrait Photo
                </label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '6px' }}>
                  Must be clear, front-facing, with at least one detectable face.
                </div>
              </div>
            </div>

            {/* Right Column: Metadata fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  className="form-control"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input 
                    type="number" 
                    name="age" 
                    required 
                    min="1" 
                    max="120"
                    value={formData.age} 
                    onChange={handleInputChange} 
                    className="form-control"
                    placeholder="e.g. 24"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleInputChange} 
                    className="form-control"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Last Seen Date</label>
                <input 
                  type="date" 
                  name="last_seen_date" 
                  value={formData.last_seen_date} 
                  onChange={handleInputChange} 
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Seen Location</label>
                <input 
                  type="text" 
                  name="last_seen_location" 
                  value={formData.last_seen_location} 
                  onChange={handleInputChange} 
                  className="form-control"
                  placeholder="e.g. near Palasia Square, Indore"
                />
              </div>
            </div>

          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '24px 0' }} />

          {/* Complainant Info Box */}
          <div style={{
            backgroundColor: '#FFFDF9',
            border: '1px dashed #E2D7C8',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--warning-text)', fontSize: '0.9rem', fontWeight: '700' }}>
              📞 Complainant / Family Contact Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Contact Name</label>
                <input 
                  type="text" 
                  name="complainant_name" 
                  value={formData.complainant_name} 
                  onChange={handleInputChange} 
                  className="form-control"
                  placeholder="e.g. Ramesh Sharma (Father)"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Contact Mobile / Email</label>
                <input 
                  type="text" 
                  name="complainant_contact" 
                  value={formData.complainant_contact} 
                  onChange={handleInputChange} 
                  className="form-control"
                  placeholder="e.g. +91 9988776655"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary"
            >
              {loading ? 'Processing Face Embedding...' : 'Enroll & Generate Face Signatures'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
