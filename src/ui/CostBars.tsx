import { costDifferenceWording } from '../core/resultPresentation'

export const CostBars = ({ current, heatPump, jaz }: { current?: number; heatPump?: number; jaz?: number }) => {
  if (current === undefined || heatPump === undefined) return <p className="muted">Not available yet</p>
  const max = Math.max(current, heatPump, 1)
  return <div className="cost-visual"><div className="cost-bar-row"><span>Current heating</span><div className="cost-bar"><i style={{ width: `${current / max * 100}%` }} /></div><strong>€{Math.round(current).toLocaleString()}</strong></div><div className="cost-bar-row"><span>Heat pump</span><div className="cost-bar cost-bar-alt"><i style={{ width: `${heatPump / max * 100}%` }} /></div><strong>€{Math.round(heatPump).toLocaleString()}</strong></div><p className="cost-difference">{costDifferenceWording(current - heatPump)}</p><small>Assumes €0.26/kWh electricity and JAZ {jaz?.toFixed(1) ?? '3.5'}.</small></div>
}
