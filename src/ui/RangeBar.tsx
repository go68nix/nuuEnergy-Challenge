import { rangePosition } from '../core/resultPresentation'

export const RangeBar = ({ methodA, methodB, combined }: { methodA?: number; methodB?: [number, number]; combined?: [number, number] }) => {
  const max = Math.max(methodA ?? 0, ...(methodB ?? [0]), ...(combined ?? [0]), 1)
  return <div className="range-visual" aria-label="Heating load range comparison">
    <div className="range-track">{combined && <span className="range-overlap" style={{ left: `${rangePosition(combined[0], 0, max)}%`, width: `${rangePosition(combined[1], 0, max) - rangePosition(combined[0], 0, max)}%` }} />}{methodB && <span className="range-method" style={{ left: `${rangePosition(methodB[0], 0, max)}%`, width: `${rangePosition(methodB[1], 0, max) - rangePosition(methodB[0], 0, max)}%` }} />}{methodA !== undefined && <i className="range-marker" style={{ left: `${rangePosition(methodA, 0, max)}%` }} />}</div>
    <div className="range-labels"><span>0 kW</span><span>{max.toFixed(1)} kW</span></div>
  </div>
}
