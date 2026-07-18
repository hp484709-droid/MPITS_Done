import React, { useState, useEffect } from 'react';
import { api } from './api/api';
import Dashboard from './pages/Dashboard';
import EnrollPerson from './pages/EnrollPerson';
import ReportSighting from './pages/ReportSighting';
import MatchCard from './components/MatchCard';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  // Admin App State
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, enroll, report
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  
  // Login Form State
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState(null);

  // Monitor location changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handleLocationChange);
    const originalPush = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPush.apply(this, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPush;
    };
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
  };

  // Auth Actions
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      await api.login(loginCreds.username, loginCreds.password);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
    } catch (err) {
      setLoginError(err.response?.data?.detail || 'Incorrect username or password. Please use admin/admin123.');
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsAuthenticated(false);
    navigateTo('/');
  };

  // ==========================================
  // 1. FAMILY SHORTLIST PORTAL VIEW
  // ==========================================
  if (currentPath.startsWith('/family/shortlist/')) {
    const token = currentPath.split('/').pop();
    return <FamilyPortal token={token} navigateTo={navigateTo} />;
  }

  // ==========================================
  // 2. ADMIN LOGIN SCREEN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: '100vh',
        background: 'var(--pastel-bg)',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div className="glass-card fade-in" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            fontSize: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto'
          }}>
            🏢
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-dark)' }}>
            MPITS Console
          </h2>
          <p style={{ margin: '0 0 32px 0', fontSize: '0.85rem', color: 'var(--text-light)', fontWeight: 500 }}>
            Missing Person Sighting Command & Control
          </p>

          {loginError && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              fontWeight: '600',
              textAlign: 'left'
            }}>
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
              <label className="form-label">Operator Username</label>
              <input 
                type="text" 
                required
                className="form-control"
                placeholder="e.g. admin"
                value={loginCreds.username}
                onChange={(e) => setLoginCreds(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            
            <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
              <label className="form-label">Security Password</label>
              <input 
                type="password" 
                required
                className="form-control"
                placeholder="••••••••"
                value={loginCreds.password}
                onChange={(e) => setLoginCreds(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
              🔑 Authorize Console Access
            </button>
          </form>

          <div style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--text-light)' }}>
            Demo Access: <strong>admin</strong> / <strong>admin123</strong>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. ADMIN DASHBOARD WORKSPACE LAYOUT
  // ==========================================
  return (
    <>
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '1.4rem' }}>👁️</span>
          <h3>MPITS Control</h3>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Case Dashboard
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'enroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('enroll')}
          >
            📝 Enroll Case Profile
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            🔎 Report Found Person
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38B2AC' }} />
            <span>Server Online</span>
          </div>
          <div style={{ fontSize: '0.7rem' }}>
            Local Node Mode (CPU-Fallback ready)
          </div>
          <button 
            onClick={handleLogout} 
            className="btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}
          >
            🔒 Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header className="header-container">
          <div className="header-title">
            <h2>
              {activeTab === 'dashboard' && 'Roster & Sighting History'}
              {activeTab === 'enroll' && 'Register New Missing Profile'}
              {activeTab === 'report' && 'Live Sighting Matching Check'}
            </h2>
            <p>
              {activeTab === 'dashboard' && 'Operator Console • Review active complaints and matches logs.'}
              {activeTab === 'enroll' && 'Enroll metadata and compute facial CNN embedding.'}
              {activeTab === 'report' && 'Upload a found person\'s photo to scan database and alert family.'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#FFFFFF',
            padding: '6px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-light)'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🧑‍✈️</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-medium)' }}>
              Operator: {localStorage.getItem('mpits_role') === 'admin' ? 'Police Admin' : 'Staff Operator'}
            </span>
          </div>
        </header>

        {/* Tab Swapper */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'enroll' && <EnrollPerson />}
          {activeTab === 'report' && <ReportSighting />}
        </div>
      </main>
    </>
  );
}

// ==========================================
// 4. FAMILY PORTAL SUB-COMPONENT
// ==========================================
function FamilyPortal({ token, navigateTo }) {
  const [shortlist, setShortlist] = useState(null);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [locationDetails, setLocationDetails] = useState(null);

  useEffect(() => {
    loadShortlist();
  }, [token]);

  const loadShortlist = async () => {
    try {
      const data = await api.getFamilyShortlist(token);
      setShortlist(data);
      if (data.status !== 'pending') {
        setResponseSubmitted(true);
      }
    } catch (e) {
      console.error(e);
      setError("This shortlist link is invalid, expired, or has already been reviewed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await api.selectFamilyCandidate(token, selectedMatchId);
      setResponseSubmitted(true);
      if (result.match_found && result.location_details) {
        setLocationDetails(result.location_details);
      }
    } catch (e) {
      console.error(e);
      setError("An error occurred while submitting your identification.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !shortlist) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', width: '100%', minHeight: '100vh', background: 'var(--pastel-bg)' }}>
        <div style={{ color: 'var(--text-light)' }}>Loading secure case files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', width: '100%', minHeight: '100vh', background: 'var(--pastel-bg)', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '480px', padding: '32px', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h3 style={{ marginTop: '16px' }}>Link Error</h3>
          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', lineHeight: '1.5' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { missing_person_name, candidates } = shortlist;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--pastel-bg)', padding: '40px 24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header Card */}
        <div className="glass-card" style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{
              padding: '4px 10px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              👪 FAMILY VERIFICATION GATEWAY
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: '8px 0 0 0', color: 'var(--text-dark)' }}>
              Identify Sighting: {missing_person_name}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-light)' }}>
              Select the photograph below that resembles your family member to confirm sightings.
            </p>
          </div>
          <span style={{ fontSize: '2rem' }}>🤝</span>
        </div>

        {/* Shortlist Flow States */}
        {!responseSubmitted ? (
          <>
            {/* Candidate List Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px'
            }}>
              {candidates.map(candidate => {
                const matchObj = {
                  id: candidate.match_id,
                  confidence_score: candidate.confidence,
                  matched_frame_path: candidate.photo_url,
                  matched_at: new Date(),
                  camera: { location_name: 'CCTV Location Sighted', camera_code: 'CCTV' },
                  missing_person: { name: missing_person_name, age: 'N/A', gender: 'N/A' }
                };

                return (
                  <MatchCard 
                    key={candidate.match_id}
                    match={matchObj}
                    isFamilyView={true}
                    isSelected={selectedMatchId === candidate.match_id}
                    onSelect={() => setSelectedMatchId(candidate.match_id)}
                  />
                );
              })}

              {/* None of These Option */}
              <div 
                className={`match-card ${selectedMatchId === 'none' ? 'selected' : ''}`}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: selectedMatchId === 'none' ? '2px solid #FA8B8B' : '1px solid #ECECEC',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifycontent: 'center',
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: selectedMatchId === 'none' ? '0 8px 24px rgba(250, 139, 139, 0.2)' : '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setSelectedMatchId('none')}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: selectedMatchId === 'none' ? 'var(--danger-bg)' : '#F7FAFC',
                  color: selectedMatchId === 'none' ? 'var(--danger-text)' : 'var(--text-light)',
                  fontSize: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifycontent: 'center',
                  marginBottom: '16px',
                  transition: 'all 0.2s ease'
                }}>
                  ❌
                </div>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-dark)' }}>None of these photos match</h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-light)', lineHeight: '1.4' }}>
                  If none of the detected faces match {missing_person_name}, choose this option to reject the shortlist.
                </p>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="glass-card" style={{ display: 'flex', justifycontent: 'flex-end', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                {selectedMatchId ? 'Selection made. Click Submit to verify.' : 'Please select an option above to proceed.'}
              </span>
              <button 
                onClick={handleSubmit}
                disabled={!selectedMatchId || loading}
                className="btn-primary"
                style={{
                  backgroundColor: selectedMatchId === 'none' ? 'var(--danger-text)' : 'var(--primary)',
                  boxShadow: selectedMatchId === 'none' ? '0 4px 14px rgba(217, 56, 56, 0.2)' : '0 4px 14px rgba(90, 107, 225, 0.25)',
                }}
              >
                {loading ? 'Submitting...' : 'Submit Identification Selection'}
              </button>
            </div>
          </>
        ) : (
          /* Response Submitted Screen */
          <div className="glass-card fade-in" style={{ padding: '40px', textAlign: 'center' }}>
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '16px' }}>
              {locationDetails ? '📍' : '📝'}
            </span>
            
            <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-dark)' }}>
              Response Successfully Submitted
            </h3>
            
            {locationDetails ? (
              <div style={{ maxWidth: '600px', margin: '20px auto 0 auto' }}>
                <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Thank you. You have confirmed a positive identification. Here are the latest sighting details log:
                </p>
                
                {/* Location Box */}
                <div style={{
                  backgroundColor: 'var(--success-bg)',
                  border: '1px solid rgba(56, 178, 172, 0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  margin: '24px 0',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifycontent: 'space-between', borderBottom: '1px solid rgba(56, 178, 172, 0.15)', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--success-text)' }}>Last Sighted Coordinates</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--success-text)', opacity: 0.8 }}>Active Match Confirmed</span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-dark)' }}>
                    📍 {locationDetails.camera_location_name} ({locationDetails.area})
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                    Sighted On: <strong>{locationDetails.date}</strong> at <strong>{locationDetails.time}</strong>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--success-text)',
                    opacity: 0.85,
                    borderTop: '1px dashed rgba(56, 178, 172, 0.15)',
                    paddingTop: '8px',
                    fontWeight: '600'
                  }}>
                    * {locationDetails.note}
                  </div>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                  This report has been forwarded to the municipal command center. Authorities have been alerted to deploy patrols in this coordinate radius.
                </p>
              </div>
            ) : (
              <div style={{ maxWidth: '520px', margin: '20px auto 0 auto' }}>
                <p style={{ color: 'var(--text-medium)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  You selected "None of these". We have logged your response. CCTV monitoring will continue automatically across all junctions, and police authorities will be notified.
                </p>
              </div>
            )}
            
            <button 
              onClick={() => navigateTo('/')} 
              className="btn-secondary"
              style={{ marginTop: '32px' }}
            >
              ↩ Return to Command Landing
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
