import React from 'react';

export default function Sparkline({ data = [], height = 40, width = 260 }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        Awaiting initial ping...
      </div>
    );
  }

  // Extract latencies and handle 0 or negative values
  const latencies = data.map(d => (typeof d === 'number' ? d : (d.response_time_ms || 0)));
  const minVal = Math.min(...latencies);
  const maxVal = Math.max(...latencies);
  const range = maxVal - minVal || 1;

  const paddingY = 6;
  const paddingX = 4;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  // Compute (x, y) coordinates
  const points = data.map((item, idx) => {
    const lat = typeof item === 'number' ? item : (item.response_time_ms || 0);
    const x = data.length === 1 
      ? width / 2 
      : paddingX + (idx / (data.length - 1)) * plotWidth;
    
    // Invert Y because SVG 0 is top
    const y = height - paddingY - ((lat - minVal) / range) * plotHeight;
    const isSuccess = typeof item === 'number' ? true : Boolean(item.is_success);
    return { x, y, lat, isSuccess };
  });

  const pathPoints = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Determine line color: if latest failed, use subtle rose, else indigo/emerald
  const latest = data[data.length - 1];
  const isLatestFailed = latest && typeof latest === 'object' && !latest.is_success;
  const strokeColor = isLatestFailed ? '#f43f5e' : '#6366f1';

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="sparkline-svg"
      preserveAspectRatio="none"
    >
      {/* Background guide line */}
      <line 
        x1={paddingX} 
        y1={height - paddingY} 
        x2={width - paddingX} 
        y2={height - paddingY} 
        stroke="rgba(255, 255, 255, 0.08)" 
        strokeWidth="1" 
        strokeDasharray="2 2"
      />

      {/* Main Sparkline Line */}
      {points.length > 1 && (
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pathPoints}
        />
      )}

      {/* Point dots: failure dots in red, latest dot */}
      {points.map((p, i) => {
        const isEnd = i === points.length - 1;
        if (!p.isSuccess) {
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#f43f5e"
              stroke="#0b0f19"
              strokeWidth="1.5"
            />
          );
        }
        if (isEnd) {
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={strokeColor}
              stroke="#0b0f19"
              strokeWidth="1"
            />
          );
        }
        return null;
      })}
    </svg>
  );
}
