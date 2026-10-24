import type { DecidingFactor } from '../core/resultPresentation'

const Icon = ({ type }: { type: DecidingFactor['icon'] }) => type === 'check' ? <span aria-hidden="true">✓</span> : type === 'warning' ? <span aria-hidden="true">!</span> : <span aria-hidden="true">·</span>

export const FactorList = ({ factors, title }: { factors: DecidingFactor[]; title?: string }) => (
  <div className="factor-list">
    {title && <h3>{title}</h3>}
    <div className="factor-chips">{factors.map(factor => <span className={`factor-chip factor-${factor.tone}`} key={factor.id}><Icon type={factor.icon} />{factor.label}</span>)}</div>
  </div>
)
