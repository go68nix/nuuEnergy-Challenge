/**
 * Technician report section: the 3D building model from live OpenStreetMap data, with possible
 * heating zones, outdoor unit spots and the record of how the building was found.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { outdoorUnitSpots, radiatorZones } from '../core/buildingModel/placement'
import { AddressNotExactError, type BuildingSearchResult, searchBuilding } from '../core/buildingModel/search'
import { formatReportTemplate, REPORT_LOCALES, type ReportLanguage } from '../core/reportLocales'
import type { BuildingInput } from '../core/types'
import { MODEL_COLOURS } from './buildingModelColours'

const BuildingModel3D = lazy(() => import('./BuildingModel3D'))

type SearchState =
  | { status: 'loading' }
  | { status: 'ready'; result: BuildingSearchResult }
  | { status: 'failed'; notExact: boolean; message: string }

type Props = { building: BuildingInput; language: ReportLanguage }

/**
 * Search the building for the entered address and show its 3D model.
 *
 * :param props: Questionnaire answers (address, heated area, building type, heating) and report language.
 * :returns: The report section.
 */
export const BuildingModelSection = ({ building, language }: Props) => {
  const text = REPORT_LOCALES[language].buildingModel
  const location = building.location?.trim()
  const [search, setSearch] = useState<SearchState>({ status: 'loading' })

  useEffect(() => {
    if (!location) return
    let active = true
    setSearch({ status: 'loading' })
    searchBuilding(location, { heatedFloorAreaM2: building.heatedFloorAreaM2, buildingType: building.buildingType })
      .then(result => active && setSearch({ status: 'ready', result }))
      .catch((error: unknown) => active && setSearch({
        status: 'failed',
        notExact: error instanceof AddressNotExactError,
        message: error instanceof Error ? error.message : String(error),
      }))
    return () => {
      active = false
    }
  }, [location, building.heatedFloorAreaM2, building.buildingType])

  const result = search.status === 'ready' ? search.result : undefined
  const zones = useMemo(() => (result ? radiatorZones(result.model, building.heatingDistribution) : []), [result, building.heatingDistribution])
  const spots = useMemo(() => (result ? outdoorUnitSpots(result.model) : []), [result])

  const body = () => {
    if (!location) return <p className="report-empty">{text.noLocation}</p>
    if (search.status === 'loading') return <p className="report-empty">{text.loading}</p>
    if (search.status === 'failed') return <p className="report-empty">{search.notExact ? text.needsExactAddress : `${text.loadFailed}: ${search.message}`}</p>
    const { model, ranking, trace, alternatives, matchedBy, osmUrl, address } = search.result
    const compass = text.compass.split(',')
    const direction = (deg: number) => compass[Math.round(deg / 45) % 8]
    const confidence = ranking.confidence === undefined ? '–' : ranking.confidence.toFixed(2)
    const match = matchedBy === 'geocoder' ? text.matchIdentity : formatReportTemplate(matchedBy === 'judges' ? text.matchJudges : text.matchUncertain, { confidence })
    const freeWalls = model.walls.filter(wall => !wall.shared).length
    const legend = [
      [MODEL_COLOURS.heating, zones.some(zone => zone.kind === 'wall') ? text.legendHeating : undefined],
      [MODEL_COLOURS.heating, zones.some(zone => zone.kind === 'floor') ? text.legendFloor : undefined],
      [MODEL_COLOURS.unit, spots.length ? text.legendUnit : undefined],
      [MODEL_COLOURS.neighbour, model.neighbours.length ? text.legendNeighbour : undefined],
      [MODEL_COLOURS.alternative, alternatives.length ? text.legendAlternative : undefined],
    ].filter((entry): entry is [string, string] => entry[1] !== undefined)

    return <>
      <p className="model-note">{text.intro}</p>
      <Suspense fallback={<p className="report-empty">{text.loading}</p>}>
        <BuildingModel3D model={model} zones={zones} spots={spots} alternatives={alternatives} noWebglText={text.noWebgl} />
      </Suspense>
      <div className="model-legend">{legend.map(([colour, label]) => <span key={label}><i className="model-swatch" style={{ background: colour }} />{label}</span>)}</div>
      {!building.heatingDistribution && <p className="model-note">{text.heatingNotGiven}</p>}
      <div className="report-data-grid">
        <article className="report-data-item"><span>{text.building}</span><strong>{address}</strong><small>{osmUrl ? <a href={osmUrl} target="_blank" rel="noreferrer">{osmUrl.replace('https://www.openstreetmap.org/', 'OSM ')}</a> : text.tileOutline}</small></article>
        <article className="report-data-item"><span>{text.footprint}</span><strong>{Math.round(model.footprintAreaM2)} m²</strong></article>
        <article className="report-data-item"><span>{text.storeys}</span><strong>{model.levels} · {model.heightM.toFixed(1)} m</strong><small>{text[model.levelsSource]}</small></article>
        <article className="report-data-item"><span>{text.walls}</span><strong>{freeWalls} / {model.walls.length - freeWalls}</strong></article>
        <article className="report-data-item"><span>{text.match}</span><strong>{match}</strong></article>
      </div>
      <h3 className="model-subtitle">{text.spotsTitle}</h3>
      <table className="model-table">
        <thead><tr><th>#</th><th>{text.facing}</th><th>{text.neighbour}</th><th>{text.max35}</th><th>{text.max40}</th></tr></thead>
        <tbody>{spots.map(spot => <tr key={spot.rank}>
          <td>{spot.rank}</td>
          <td>{direction(spot.wall.facingDeg)}</td>
          <td>{spot.nearestNeighbour ? `${spot.nearestNeighbour.distanceM.toFixed(1)} m` : text.noNeighbour}</td>
          <td>{spot.maxSoundPowerDb ? `${spot.maxSoundPowerDb.pureResidential.toFixed(0)} dB(A)` : '–'}</td>
          <td>{spot.maxSoundPowerDb ? `${spot.maxSoundPowerDb.generalResidential.toFixed(0)} dB(A)` : '–'}</td>
        </tr>)}</tbody>
      </table>
      <p className="model-note">{text.spotNote}</p>
      <details className="model-search">
        <summary>{text.searchTitle}</summary>
        <table className="model-table">
          <thead><tr><th>{text.candidate}</th><th>{text.strength}</th><th>{text.votesWon}</th></tr></thead>
          <tbody>{ranking.ranked.slice(0, 5).map(({ candidate, strength }) => <tr key={candidate.id}>
            <td>{candidate.id}</td><td>{strength.toFixed(2)}</td><td>{ranking.votes.filter(vote => vote.winner === candidate.id).length}</td>
          </tr>)}</tbody>
        </table>
        <table className="model-table">
          <thead><tr><th>{text.step}</th><th>{text.source}</th><th>{text.kind}</th><th>{text.index}</th><th>{text.confidence}</th><th>{text.duration}</th><th>{text.outcome}</th></tr></thead>
          <tbody>{trace.map(step => <tr key={step.step}>
            <td>{step.step}</td><td>{step.source}</td><td>{step.kind}</td><td>{step.index?.toFixed(2) ?? '–'}</td><td>{step.confidence?.toFixed(2) ?? '–'}</td><td>{step.ms} ms</td><td>{step.outcome}</td>
          </tr>)}</tbody>
        </table>
      </details>
      <p className="model-note">{text.attribution}</p>
    </>
  }

  return <section className="report-section building-model-section"><h2>{text.title}</h2>{body()}</section>
}
