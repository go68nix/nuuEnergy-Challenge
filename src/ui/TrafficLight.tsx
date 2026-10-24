import type { TrafficLight as Verdict } from '../core/types'

export const TrafficLight = ({ level }: { level: Verdict }) => (
  <svg className="traffic-light" viewBox="0 0 84 206" role="img" aria-label={`${level} verdict`}>
    <rect x="7" y="4" width="70" height="198" rx="35" fill="currentColor" opacity=".16" />
    {(['red', 'yellow', 'green'] as const).map((lamp, index) => (
      <circle key={lamp} className={`traffic-lamp traffic-lamp-${lamp} ${level === lamp ? 'is-active' : ''}`} cx="42" cy={39 + index * 64} r="20" />
    ))}
  </svg>
)
