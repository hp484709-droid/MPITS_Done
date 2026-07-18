import React, { useState } from 'react';
import { api } from '../api/api';

export default function ReportSighting() {
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) {
      setError("Please upload a photograph of the sighted person.");
      return;
    }
    if (!location.trim()) {
      setError("Please specify the location coordinates where the person was found.");
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);

    const submissionData = new FormData();
    submissionData.append('location', location);
    submissionData.append('photo', photo);

    try {
      // Artificially delay for 2 seconds to show the scanning animation (great for demo and UX!)
      const [res] = await Promise.all([
        api.reportSighting(submissionData),
        new Promise(resolve => setTimeout(resolve, 2200))
      ]);
      
      setResult(res);
      // Reset form on success (but keep preview url for results display)
      setLocation('');
      setPhoto(null);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "An error occurred while matching coordinates.";
      setError(errMsg);
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setPreviewUrl(null);
    setLocation('');
  };

  return (
    <div className="fade-in" style={{ padding: '32px', maxWidth: '840px', margin: '0 auto' }}>
      
      {!scanning && !result && (
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
                🔍 Report Found Person (Live Check)
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                Upload a photo of a sighted person. OpenCV & CNN will automatically query active missing complaints.
              </p>
            </div>
            <span style={{ fontSize: '1.8rem' }}>👤</span>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              
              {/* Left Column: Image Picker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-light)', paddingRight: '24px' }}>
                <div style={{
                  width: '240px',
                  height: '240px',
                  borderRadius: '16px',
                  border: '2.5px dashed #CBD5E0',
                  backgroundColor: '#FFFDF9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '16px' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📸</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Drop Sighting Photo</div>
                    </div>
                  )}
                </div>

                <div style={{ width: '100%', textAlign: 'center' }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="sighting-upload" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  <label 
                    htmlFor="sighting-upload" 
                    className="btn-secondary" 
                    style={{ 
                      display: 'inline-flex',
                      cursor: 'pointer',
                      width: '100%',
                      justifyContent: 'center',
                      boxSizing: 'border-box'
                    }}
                  >
                    📂 Browse Sighted Image
                  </label>
                </div>
              </div>

              {/* Right Column: Sighting Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                <div className="form-group">
                  <label className="form-label">📍 Where Sighted / Found? *</label>
                  <input 
                    type="text" 
                    required 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className="form-control"
                    placeholder="e.g. Platform 4, Indore Railway Station"
                  />
                  <small style={{ color: 'var(--text-light)', fontSize: '0.75rem', marginTop: '4px' }}>
                    Specify precise coordinates, area, or checkpoint.
                  </small>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    🔎 Scan Database & Run Live Check
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* 2. SCANNING ANIMATION STATE */}
      {scanning && (
        <div className="glass-card fade-in" style={{ padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Scanning Box overlay */}
          <div style={{
            width: '200px',
            height: '200px',
            borderRadius: '16px',
            border: '3px solid var(--primary)',
            backgroundColor: '#1A1A24',
            position: 'relative',
            margin: '0 auto 24px auto',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Scanning" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} 
              />
            )}
            
            {/* Scan Line animation */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '4px',
              background: 'linear-gradient(to bottom, rgba(90, 107, 225, 0.4), var(--primary))',
              boxShadow: '0 0 12px var(--primary)',
              animation: 'scan 2s linear infinite',
            }} />
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-dark)', margin: 0 }}>
            OpenCV Face Detection Active
          </h3>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: '500' }}>
            Converting pixels to 128-d spatial coordinates... Checking CNN active database records.
          </p>
        </div>
      )}

      {/* 3. SIGHTING CHECK RESULT STATE */}
      {!scanning && result && (
        <div className="fade-in">
          
          {result.match_found ? (
            /* MATCH FOUND CONTAINER */
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '28px', borderLeft: '6px solid var(--success)' }}>
              
              {/* Alert Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
                <div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--success-bg)',
                    color: 'var(--success-text)',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    🎉 SURVEILLANCE MATCH DETECTED!
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-display)', margin: '8px 0 0 0', color: 'var(--text-dark)' }}>
                    Complaint Found in Database
                  </h2>
                </div>
                <span style={{ fontSize: '2.5rem' }}>🔔</span>
              </div>

              {/* Side-by-Side Images */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#FAF9F6', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <img 
                    src={api.getFileUrl(result.match_details.photo_path)} 
                    alt="Original Case Photo" 
                    style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: '8px', left: '8px',
                    backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dark)'
                  }}>
                    Original Complaint Photo
                  </div>
                </div>

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <img 
                    src={api.getFileUrl(result.match_details.sighting_photo)} 
                    alt="Reported Sighting Photo" 
                    style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: '8px', left: '8px',
                    backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dark)'
                  }}>
                    Reported Sighting Photo
                  </div>
                </div>
              </div>

              {/* Match details & SMS details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-dark)' }}>
                    Person Identified:
                  </h4>
                  <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-medium)' }}>
                    <div>Name: <strong>{result.match_details.name}</strong></div>
                    <div>Match Confidence: <strong>{result.match_details.confidence.toFixed(1)}%</strong></div>
                    <div>Location Found: <strong>{result.match_details.sighting_location}</strong></div>
                  </div>
                </div>

                {/* Simulated SMS Card */}
                <div style={{
                  backgroundColor: 'var(--success-bg)',
                  border: '1px solid rgba(56, 178, 172, 0.15)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: '700', textTransform: 'uppercase' }}>
                    📲 INSTANT FAMILY ALERT SENT
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-medium)', fontWeight: '600' }}>
                    Recipient Mobile: {result.match_details.complainant_contact} ({result.match_details.complainant_name})
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px dashed rgba(56,178,172,0.3)', margin: '4px 0' }} />
                  <div style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.78rem', 
                    color: 'var(--success-text)', 
                    backgroundColor: '#FFFFFF',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(56,178,172,0.1)',
                    whiteSpace: 'pre-line',
                    lineHeight: '1.4'
                  }}>
                    {result.match_details.simulated_message}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button onClick={handleReset} className="btn-primary">
                  🔍 Report Another Sighting
                </button>
              </div>

            </div>
          ) : (
            /* NO MATCH DETECTED */
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', borderLeft: '6px solid var(--warning)' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>📂</span>
              <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-dark)', margin: '0 0 12px 0' }}>
                No Match Detected in Database
              </h2>
              <p style={{ maxWidth: '520px', margin: '0 auto 24px auto', color: 'var(--text-medium)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                The uploaded photograph did not match any active missing person complaints in our database system. 
                However, this sighting log at <strong>{location || 'specified coordinates'}</strong> has been registered. If a matching complaint is filed in the future, the family will be notified instantly.
              </p>
              
              <button onClick={handleReset} className="btn-primary">
                🔍 Report Another Sighting
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
