/**
 * EmotionChart
 *
 * Recharts area chart showing the emotion label over time.
 * Receives `readings` — array of EmotionReadingResponse objects.
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = {
  confident: '#22c55e',
  neutral: '#60a5fa',
  stressed: '#f87171',
}

export function EmotionChart({ readings }) {
  if (!readings || readings.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: 32 }}>
        Waiting for emotion data…
      </div>
    )
  }

  // Build per-label confidence series
  const data = readings.map((r) => {
    const point = { name: `${r.frame_index}`, frame: r.frame_index }
    Object.keys(COLORS).forEach((label) => {
      point[label] = r.interview_label === label ? r.confidence_score : 0
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          {Object.entries(COLORS).map(([label, color]) => (
            <linearGradient key={label} id={`grad_${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.5} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'frame', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
        <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value, name) => [`${Math.round(value * 100)}%`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {Object.entries(COLORS).map(([label, color]) => (
          <Area
            key={label}
            type="monotone"
            dataKey={label}
            stroke={color}
            fill={`url(#grad_${label})`}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
