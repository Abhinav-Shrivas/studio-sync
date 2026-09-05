import React, { useState } from 'react';

export function AttendanceChart({ data = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No attendance trend data available</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => Number(d.attended || 0)), 5);
  // Give 10% breathing room above max
  const yMax = Math.ceil(maxVal * 1.2);

  const width = 700;
  const height = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 40 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - (Number(d.attended || 0) / yMax) * plotHeight;
    return {
      x,
      y,
      week: d.week,
      attended: Number(d.attended || 0),
    };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`
    : '';

  // Format week label like "Aug 17"
  const formatWeek = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), yMax];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            Attendance Trends (Last 8 Weeks)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Weekly attended check-ins across completed sessions
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '3px',
              backgroundColor: 'var(--primary)',
              borderRadius: '2px',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Attended</span>
        </div>
      </div>

      <div style={{ width: '100%', position: 'relative', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', minWidth: '500px', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="attAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((val, i) => {
            const y = padding.top + plotHeight - (val / yMax) * plotHeight;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontSize="11"
                  fontWeight="500"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#attAreaGrad)" />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary-hover)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & hover triggers */}
          {points.map((pt, i) => {
            const isHovered = hoveredPoint?.week === pt.week;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 7 : 4.5}
                  fill="var(--bg-card)"
                  stroke="var(--primary-hover)"
                  strokeWidth="2.5"
                  style={{ transition: 'r 0.15s ease', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* X axis labels */}
                <text
                  x={pt.x}
                  y={height - 12}
                  textAnchor="middle"
                  fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontSize="11"
                  fontWeight={isHovered ? '600' : '400'}
                >
                  {formatWeek(pt.week)}
                </text>
              </g>
            );
          })}

          {/* Hover Tooltip Overlay in SVG */}
          {hoveredPoint && (
            <g
              transform={`translate(${Math.min(
                Math.max(hoveredPoint.x, padding.left + 50),
                width - padding.right - 50
              )}, ${hoveredPoint.y - 45})`}
            >
              <rect
                x="-45"
                y="-18"
                width="90"
                height="32"
                rx="6"
                fill="var(--bg-elevated)"
                stroke="var(--border)"
                strokeWidth="1"
                filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))"
              />
              <text
                x="0"
                y="-2"
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="10"
              >
                Week of {formatWeek(hoveredPoint.week)}
              </text>
              <text
                x="0"
                y="10"
                textAnchor="middle"
                fill="#818CF8"
                fontSize="12"
                fontWeight="700"
              >
                {hoveredPoint.attended} attended
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
