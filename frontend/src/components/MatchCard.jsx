import React from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import { api } from '../api/api';

export default function MatchCard({ 
  match, 
  onReview, 
  isFamilyView = false, 
  isSelected = false, 
  onSelect = null 
}) {
  const {
    id,
    confidence_score,
    matched_frame_path,
    matched_at,
    camera,
    missing_person
  } = match;
  
  const originalPhoto = api.getFileUrl(missing_person?.photo_path);
  const matchedFrame = api.getFileUrl(matched_frame_path);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className={`match-card ${isSelected ? 'selected' : ''}`} style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: isSelected ? '2px solid #B8C4F4' : '1px solid #ECECEC',
      boxShadow: isSelected 
        ? '0 8px 24px rgba(184, 196, 244, 0.3)' 
        : '0 4px 12px rgba(0, 0, 0, 0.03)',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: isFamilyView ? 'pointer' : 'default',
    }}
    onClick={isFamilyView && onSelect ? onSelect : undefined}
    >
      {/* Top Banner */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: isSelected ? '#F0F2FF' : '#F9FBFB',
        borderBottom: '1px solid #ECECEC',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.85rem', color: '#718096', fontWeight: '500' }}>
          Sighting S-{id}
        </span>
        <ConfidenceBadge confidence={confidence_score} />
      </div>

      {/* Split Image view */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #ECECEC',
        backgroundColor: '#FAF9F6'
      }}>
        {/* Original Enrollment Photo */}
        <div style={{
          flex: 1,
          position: 'relative',
          borderRight: '1px solid #ECECEC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <img 
            src={originalPhoto} 
            alt="Missing Person" 
            style={{
              width: '100%',
              height: '180px',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(4px)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600',
            color: '#4A5568'
          }}>
            Enrolled Photo
          </div>
        </div>

        {/* Live CCTV Match Photo */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <img 
            src={matchedFrame} 
            alt="CCTV Sighting" 
            style={{
              width: '100%',
              height: '180px',
              objectFit: 'cover'
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(4px)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '600',
            color: '#4A5568'
          }}>
            CCTV Sighting
          </div>
        </div>
      </div>

      {/* Details Area */}
      <div style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#2D3748', fontWeight: '700' }}>
              {missing_person?.name || 'Unknown Person'}
            </h4>
            <span style={{ fontSize: '0.8rem', color: '#718096' }}>
              Age {missing_person?.age} • {missing_person?.gender}
            </span>
          </div>
          {isFamilyView && (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: isSelected ? '2px solid #4A5DFF' : '2px solid #CBD5E0',
              backgroundColor: isSelected ? '#4A5DFF' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              {isSelected && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF'
                }} />
              )}
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #ECECEC', margin: '4px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#A0AEC0' }}>📍</span>
            <span style={{ fontWeight: '600', color: '#4A5568' }}>{camera?.location_name || 'Camera Junction'}</span>
            <span style={{ fontSize: '0.75rem', color: '#A0AEC0' }}>({camera?.camera_code})</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: '#A0AEC0' }}>⏰</span>
            <span style={{ color: '#4A5568' }}>{formatDate(matched_at)}</span>
          </div>
        </div>

        {/* Admin Action Buttons */}
        {!isFamilyView && onReview && (
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '12px'
          }}>
            <button
              onClick={() => onReview(id, 'confirmed')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#E6FFFA',
                color: '#007A64',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="confirm-btn"
            >
              Confirm Match
            </button>
            <button
              onClick={() => onReview(id, 'rejected')}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#FFECEC',
                color: '#D93838',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              className="reject-btn"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
