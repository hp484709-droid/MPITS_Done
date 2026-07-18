import React from 'react';

export default function ConfidenceBadge({ confidence }) {
  const score = parseFloat(confidence) || 0;
  
  let bg = '#FFECEC'; // soft pastel red
  let color = '#D93838'; // deep pastel red text
  let label = 'Low Sighting Probability';
  
  if (score >= 70) {
    bg = '#E6FFFA'; // soft pastel teal/green
    color = '#007A64'; // deep green
    label = 'High Sighting Probability';
  } else if (score >= 50) {
    bg = '#FFF8E6'; // soft pastel orange/yellow
    color = '#B27600'; // deep orange
    label = 'Moderate Sighting Probability';
  }
  
  return (
    <div 
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '20px',
        backgroundColor: bg,
        color: color,
        fontWeight: '600',
        fontSize: '0.85rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
        border: `1px solid ${color}20`,
        width: 'fit-content',
        transition: 'all 0.2s ease',
      }}
      title={`${score.toFixed(1)}% Match Confidence`}
    >
      <span 
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          animation: score >= 70 ? 'pulse 2s infinite' : 'none'
        }}
      />
      <span>{score.toFixed(0)}% - {label}</span>
    </div>
  );
}
