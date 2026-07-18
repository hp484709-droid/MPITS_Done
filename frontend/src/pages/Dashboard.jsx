import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

export default function Dashboard() {
  const [persons, setPersons] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({
    totalEnrolled: 0,
    activeCases: 0,
    confirmedSightings: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch missing persons
      const personsData = await api.listMissingPersons();
      setPersons(personsData);

      // 2. Fetch confirmed matches (sightings)
      const confirmedData = await api.getMatches('confirmed');
      setSightings(confirmedData);

      setStats({
        totalEnrolled: personsData.length,
        activeCases: personsData.filter(p => p.status === 'active').length,
        confirmedSightings: confirmedData.length
      });

    } catch (e) {
      console.error(e);
      setError("Unable to synchronise console databases.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (personId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'found' : 'active';
    try {
      await api.updatePersonStatus(personId, nextStatus);
      loadData();
    } catch (err) {
      console.error(err);
      setError("Failed to update case file status.");
    }
  };

  const handleDeletePerson = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this missing person case file? All associated sightings will be deleted.")) return;
    try {
      await api.deleteMissingPerson(id);
      loadData();
    } catch (err) {
      console.error(err);
      setError("Failed to archive case record.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fade-in" style={{ padding: '32px' }}>
      
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

      {/* Stats Counters Grid */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        
        <div className="glass-card stat-card" style={{ borderLeft: '5px solid var(--primary)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>📋</div>
          <div className="stat-info">
            <h3>{stats.totalEnrolled}</h3>
            <p>Total Complaints Filed</p>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '5px solid var(--warning)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' }}>🔍</div>
          <div className="stat-info">
            <h3>{stats.activeCases}</h3>
            <p>Active Search Cases</p>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ borderLeft: '5px solid var(--success)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}>🔔</div>
          <div className="stat-info">
            <h3>{stats.confirmedSightings}</h3>
            <p>Matched Sighting Reports</p>
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Enrolled Complaints Roster */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span> Active Missing Complaints Directory
            </h3>
            <button onClick={loadData} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              🔄 Refresh
            </button>
          </div>

          {persons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📁</span>
              <h4>Roster Empty</h4>
              <p style={{ fontSize: '0.85rem' }}>Enroll a missing case file to generate face CNN embeddings.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Portrait</th>
                    <th>Name</th>
                    <th>Age / Gender</th>
                    <th>Last Seen Coordinates</th>
                    <th>Complainant Contact</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map(p => (
                    <tr key={p.id}>
                      <td>
                        <img 
                          src={api.getFileUrl(p.photo_path)} 
                          alt={p.name}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid #E2E8F0'
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>ID Ref: #{p.id}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-medium)' }}>
                          {p.age} yrs • {p.gender}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-medium)' }}>
                          {p.last_seen_location || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                          On: {p.last_seen_date || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-medium)' }}>
                          {p.complainant_name || 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                          {p.complainant_contact || ''}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          backgroundColor: p.status === 'active' ? 'var(--danger-bg)' : 'var(--success-bg)',
                          color: p.status === 'active' ? 'var(--danger-text)' : 'var(--success-text)'
                        }}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => handleToggleStatus(p.id, p.status)}
                            className="btn-secondary"
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '0.8rem',
                              backgroundColor: p.status === 'active' ? 'var(--success-bg)' : '#EDF2F7',
                              color: p.status === 'active' ? 'var(--success-text)' : 'var(--text-dark)',
                              border: 'none'
                            }}
                          >
                            {p.status === 'active' ? '✓ Mark Found' : '↻ Reactivate'}
                          </button>
                          <button
                            onClick={() => handleDeletePerson(p.id)}
                            className="btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--danger-text)' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reported Sighting Matches Logs */}
        <div className="glass-card">
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔔</span> Verified Sighting Match History
            </h3>
          </div>

          {sightings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>📭</span>
              <h4>No Sighting Matches Registered</h4>
              <p style={{ fontSize: '0.85rem' }}>Reported sightings that match enrolled faces will appear here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Sighting Snapshot</th>
                    <th>Missing Person Sighted</th>
                    <th>Location Sighted</th>
                    <th>Date & Time</th>
                    <th>Match Score</th>
                    <th>Alert Dispatched To</th>
                  </tr>
                </thead>
                <tbody>
                  {sightings.map(s => (
                    <tr key={s.id}>
                      <td>
                        <img 
                          src={api.getFileUrl(s.matched_frame_path)} 
                          alt="Sighting Frame"
                          style={{
                            width: '90px',
                            height: '56px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid #E2E8F0'
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{s.missing_person?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Age {s.missing_person?.age} • {s.missing_person?.gender}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-medium)' }}>
                          {s.camera?.location_name || 'Public Coordinates'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                          {formatDate(s.matched_at)}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          backgroundColor: 'var(--success-bg)',
                          color: 'var(--success-text)'
                        }}>
                          {s.confidence_score.toFixed(0)}% Match
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--success-text)' }}>
                          📲 Registered Contact Alerted
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                          {s.missing_person?.complainant_contact}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
