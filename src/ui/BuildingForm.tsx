import { useEffect, useState } from 'react'
import { buildingSchema } from '../core/schema'
import type { BuildingInput } from '../core/types'
import type { HeaterPhoto } from '../core/types'
import { clearPipeEstimateOnChange, setEstimatedPipeAnswer } from '../core/questionnaireState'
import { lookupPublicData } from '../core/publicData/service'
import type { PublicDataResult } from '../core/publicData/types'
import { assessPipeType } from '../core/modules/pipeType'
import { filenamePipeDetector } from '../core/pipeDetector'
import { createForegroundMask } from './localHighlightWorker'
import { createHighlightedPhoto } from './createHighlightedPhoto'
import { PIPE_DETECTION_CONFIG } from '../core/pipeDetectionConfig'
import { PipePhotoHelper } from './PipePhotoHelper'
import { LocationMapPreview } from './LocationMapPreview'

type Props = { onSubmitBuilding: (building: BuildingInput, photos: HeaterPhoto[]) => void; onPhotosChange?: (photos: HeaterPhoto[]) => void }
type AnswerKey = keyof BuildingInput
type Choice = { value: string; label: string; detail?: string }
type Question = { key: AnswerKey; title: string; hint: string; type: 'choice' | 'range' | 'year' | 'location'; choices?: Choice[]; min?: number; max?: number; unit?: string }
const questions: Question[] = [
  { key: 'location', title: 'Where is your building located?', hint: 'Enter your German postal code, city, or address to automatically integrate DIN EN 12831 climate data, grid operator (§14a EnWG), and local subsidies. Or skip this step to use standard national baselines.', type: 'location' },
  { key: 'heatingDistribution', title: 'How is your room heated?', hint: 'Choose the heating type used in the rooms you use most.', type: 'choice', choices: [{value:'radiator',label:'Radiator'},{value:'underfloor',label:'Underfloor heating'},{value:'mixed',label:'Underfloor heating and radiator'}] },
  { key: 'pipe_system', title: 'Do you know your pipe type?', hint: 'Select the pipe system connected to your radiators.', type: 'choice', choices: [{value:'two-pipe',label:'Two-pipe'},{value:'single-pipe',label:'Single-pipe'},{value:'unknown',label:"I don't know"}] },
  { key: 'buildingType', title: 'What type of building is this?', hint: 'Choose the closest match for your home.', type: 'choice', choices: [{value:'single_two_family',label:'Single or two family house'},{value:'apartment',label:'Apartment building'},{value:'end_terrace',label:'End-of-terrace house'},{value:'mid_terrace',label:'Terraced house · middle'},{value:'semi_detached',label:'Semi-detached house'}] },
  { key: 'heatingSystem', title: 'How do you currently heat your building?', hint: 'Choose the system currently installed.', type: 'choice', choices: [{value:'gas',label:'Gas heating'},{value:'oil',label:'Oil heating'},{value:'pellet',label:'Pellet heating'},{value:'gas_condensing',label:'Condensing gas boiler'},{value:'oil_condensing',label:'Condensing oil heating'},{value:'district_other',label:'District heating or other'}] },
  { key: 'annualConsumption', title: 'What is your average annual consumption?', hint: 'Use your annual statement. Estimate if needed.', type: 'range', min: 1000, max: 60000, unit: 'kWh / year' },
  { key: 'constructionOrRenovationYear', title: 'In which year was this building built?', hint: 'Enter the original construction year. A rough estimate is fine.', type: 'year', min: 1800, max: new Date().getFullYear(), unit: 'year' },
  { key: 'facadeInsulated', title: 'Was the facade subsequently insulated?', hint: 'Choose “Yes” if insulation was added after construction.', type: 'choice', choices: [{value:'true',label:'Yes'},{value:'false',label:'No'},{value:'unknown',label:'I don’t know'}] },
  { key: 'roofInsulated', title: 'Was your roof retrofitted or insulated?', hint: 'Choose “Yes” if the roof or attic was insulated later.', type: 'choice', choices: [{value:'true',label:'Yes'},{value:'false',label:'No'},{value:'unknown',label:'I don’t know'}] },
  { key: 'heatedFloorAreaM2', title: 'What is the heated living space?', hint: 'Include the indoor area that is regularly heated.', type: 'range', min: 30, max: 500, unit: 'm²' },
  { key: 'heatingSystemAge', title: 'How long has your heating system been in operation?', hint: 'Select “Unknown” if you are not sure.', type: 'choice', choices: [{value:'0_9',label:'0–9 years'},{value:'10_19',label:'10–19 years'},{value:'20_29',label:'20–29 years'},{value:'30_plus',label:'30+ years'},{value:'unknown',label:'Unknown'}] },
  { key: 'replacementTiming', title: 'When should a new heating system be installed?', hint: 'This helps us understand your timeline.', type: 'choice', choices: [{value:'immediately',label:'Immediately'},{value:'1_3_months',label:'In 1 to 3 months'},{value:'3_6_months',label:'In 3 to 6 months'},{value:'over_6_months',label:'In more than 6 months'},{value:'not_planned',label:'Not currently planned'}] },
  { key: 'winterHeatedShare', title: 'How much of your apartment is heated in winter?', hint: 'Optional detail to refine the home profile.', type: 'choice', choices: [{value:'half',label:'About one half'},{value:'third',label:'About one third'},{value:'quarter',label:'About one quarter'},{value:'other',label:'Other'}] },
]
const initial: Partial<Record<AnswerKey, string | number | boolean>> = { location: '', heatingDistribution: '', pipe_system: '', buildingType: '', heatingSystem: '', annualConsumption: 18000, constructionOrRenovationYear: 1990, facadeInsulated: '', roofInsulated: '', heatedFloorAreaM2: 140, heatingSystemAge: '', replacementTiming: '', winterHeatedShare: '' }
const labels: Record<string,string> = { radiator:'Radiator',underfloor:'Underfloor heating',mixed:'Underfloor heating and radiator',single_two_family:'Single or two family house',apartment:'Apartment building',end_terrace:'End-of-terrace house',mid_terrace:'Terraced house · middle',semi_detached:'Semi-detached house',gas:'Gas heating',oil:'Oil heating',pellet:'Pellet',gas_condensing:'Condensing gas boiler',oil_condensing:'Condensing oil heating',district_other:'District heating or other',true:'Yes',false:'No',unknown:'Unknown',half:'About one half',third:'About one third',quarter:'About one quarter',other:'Other','0_9':'0–9 years','10_19':'10–19 years','20_29':'20–29 years','30_plus':'30+ years',immediately:'Immediately','1_3_months':'In 1 to 3 months','3_6_months':'In 3 to 6 months',over_6_months:'In more than 6 months',not_planned:'Not currently planned' }

export const BuildingForm = ({ onSubmitBuilding, onPhotosChange }: Props) => {
  const [started,setStarted]=useState(false),[step,setStep]=useState(0),[values,setValues]=useState(initial),[error,setError]=useState(''),[helperOpen,setHelperOpen]=useState(false),[photos,setPhotos]=useState<HeaterPhoto[]>([]),[pipeEvidence,setPipeEvidence]=useState<{evidence?:string[];confidence?:number}>({})
  const [answered, setAnswered] = useState<Set<AnswerKey>>(() => new Set(['annualConsumption', 'constructionOrRenovationYear', 'heatedFloorAreaM2', 'location']))
  const [locationInput, setLocationInput] = useState('')
  const [publicData, setPublicData] = useState<PublicDataResult | undefined>(undefined)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [locationSearchError, setLocationSearchError] = useState('')
  useEffect(() => onPhotosChange?.(photos), [photos, onPhotosChange])
  const finish = async () => {
    let finalPublicData = publicData
    if (values.location && typeof values.location === 'string' && values.location.trim()) {
      try {
        finalPublicData = await lookupPublicData(values.location.trim(), {
          annualConsumption: Number(values.annualConsumption),
          heatedFloorAreaM2: Number(values.heatedFloorAreaM2),
          constructionOrRenovationYear: Number(values.constructionOrRenovationYear),
          buildingType: values.buildingType as BuildingInput['buildingType'],
          heatingSystem: values.heatingSystem as BuildingInput['heatingSystem'],
        })
      } catch {
        // Retain existing publicData if re-fetch fails
      }
    }
    const normalized = {
      ...values,
      ...pipeEvidence,
      location: values.location ? String(values.location) : undefined,
      publicData: finalPublicData,
      occupants: undefined,
      annualConsumption: Number(values.annualConsumption),
      heatedFloorAreaM2: Number(values.heatedFloorAreaM2),
      constructionOrRenovationYear: Number(values.constructionOrRenovationYear),
      fuelType: 'gas_kwh' as const,
    }
    const parsed = buildingSchema.safeParse(normalized)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your answers.')
      return
    }
    setError('')
    onSubmitBuilding(parsed.data, photos)
    setStep(questions.length)
  }
  const setAnswer = (key: AnswerKey, value: string | number | boolean | undefined) => {
    setValues(v => ({ ...v, [key]: value }))
    setAnswered(current => new Set(current).add(key))
    setError('')
  }
  const goForward = () => {
    const key = questions[step].key
    if (!answered.has(key)) {
      setError('Please answer this question before continuing.')
      return
    }
    setError('')
    if (step === questions.length - 1) finish()
    else setStep(current => current + 1)
  }
  const handleSearchLocation = async (query = locationInput) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setIsSearchingLocation(true)
    setLocationSearchError('')
    try {
      const pd = await lookupPublicData(trimmed)
      setPublicData(pd)
      setAnswer('location', trimmed)
    } catch {
      setLocationSearchError('Could not find public data for this location. You can skip or try a postal code.')
    } finally {
      setIsSearchingLocation(false)
    }
  }
  const handleSkipLocation = () => {
    setLocationInput('')
    setPublicData(undefined)
    setAnswer('location', undefined)
    setError('')
    setLocationSearchError('')
    setStep(s => s + 1)
  }
  const handleContinueLocation = async () => {
    setError('')
    if (publicData) {
      setAnswer('location', locationInput.trim())
      setStep(s => s + 1)
      return
    }
    if (locationInput.trim()) {
      setIsSearchingLocation(true)
      try {
        const pd = await lookupPublicData(locationInput.trim())
        setPublicData(pd)
        setAnswer('location', locationInput.trim())
        setStep(s => s + 1)
      } catch {
        setLocationSearchError('Could not find public data. Skip or try entering a 5-digit postal code.')
      } finally {
        setIsSearchingLocation(false)
      }
      return
    }
    handleSkipLocation()
  }
  const assessPhotos = async (files: FileList | null) => {
    if (!files) return
    await Promise.all(Array.from(files).map(async file => {
      const detection = await filenamePipeDetector.analyze(file)
      const url = URL.createObjectURL(file)
      const photoId = `${file.name}-${Date.now()}-${Math.random()}`
      const basePhoto = { id: photoId, name: file.name, url, ...detection, label: PIPE_DETECTION_CONFIG.results[detection.kind].label, highlightStatus: 'loading' as const, highlightMessage: 'Loading local highlight model…' }
      setPhotos(current => [...current, basePhoto])
      const mask = await createForegroundMask(file, stage => setPhotos(current => current.map(photo => photo.id === photoId ? { ...photo, highlightMessage: stage === 'loading' ? 'Loading local highlight model…' : 'Creating highlight…' } : photo)))
      if (!mask) {
        setPhotos(current => current.map(photo => photo.id === photoId ? { ...photo, highlightStatus: 'failed' } : photo))
        return
      }
      if (detection.kind === 'not-heater') {
        setPhotos(current => current.map(photo => photo.id === photoId ? { ...photo, highlightStatus: 'ready' } : photo))
        return
      }
      try {
        const highlightedUrl = await createHighlightedPhoto(file, mask)
        setPhotos(current => current.map(photo => photo.id === photoId ? { ...photo, highlightedUrl, highlightStatus: 'ready' } : photo))
      } catch {
        setPhotos(current => current.map(photo => photo.id === photoId ? { ...photo, highlightStatus: 'failed' } : photo))
      }
    }))
  }
  const bestDetection = photos.filter(photo => photo.kind !== 'not-heater').sort((a,b) => b.confidence-a.confidence)[0]
  const detectedPipe = bestDetection?.kind === 'single-pipe' ? 'single-pipe' : bestDetection?.kind === 'two-pipe' ? 'two-pipe' : 'unknown'
  const pipeResult = bestDetection ? assessPipeType({ fuelType:'gas_kwh', annualConsumption:18000, heatedFloorAreaM2:140, constructionOrRenovationYear:Number(values.constructionOrRenovationYear ?? 1990), ...setEstimatedPipeAnswer(detectedPipe), pipeSystemEvidence:bestDetection.evidence, pipeSystemConfidence:bestDetection.confidence }) : undefined
  const continueFromHelper = () => { if (!bestDetection) return; setValues(current=>({...current,...setEstimatedPipeAnswer(detectedPipe)}));setAnswered(current=>new Set(current).add('pipe_system'));setPipeEvidence({evidence:bestDetection.evidence,confidence:bestDetection.confidence});setHelperOpen(false);setStep(step+1) }
  return <section className="intake-shell" id="assessment">{!started?<div className="welcome-card"><div className="welcome-copy"><span className="eyebrow">YOUR HOME, MORE COMFORTABLY</span><h1>A clearer path to<br/><em>cleaner heating.</em></h1><p>Answer a few quick questions about your home and we’ll create a tailored heat pump suitability snapshot.</p><div className="welcome-meta"><span>◷ &nbsp;About 3 minutes</span><span>⌂ &nbsp;No technical knowledge needed</span></div><button className="button-primary" onClick={()=>setStarted(true)}>Start your assessment <span>→</span></button></div><div className="welcome-art" aria-hidden="true"><div className="sun-orb"/><div className="house"><div className="roof"/><div className="house-body"><div className="window w1"/><div className="window w2"/><div className="door"/></div><div className="chimney"/></div><div className="art-caption">A warmer home.<br/>A lighter footprint.</div></div></div>:<div className="wizard-card"><div className="wizard-top"><a className="brand" href="#top"><span className="brand-mark">n</span> nuu<span>energy</span></a><span className="step-label">{helperOpen?'PHOTO PIPE CHECK':step<questions.length?`QUESTION ${step+1} OF ${questions.length}`:'ASSESSMENT COMPLETE'}</span></div>{helperOpen ? <PipePhotoHelper photos={photos} pipeResult={pipeResult} unclear={bestDetection?.kind==='pipe-unclear'} onUpload={assessPhotos} onRemove={photo=>{URL.revokeObjectURL(photo.url);if(photo.highlightedUrl)URL.revokeObjectURL(photo.highlightedUrl);setPhotos(current=>current.filter(item=>item.id!==photo.id))}} onBack={()=>setHelperOpen(false)} onContinue={continueFromHelper} canContinue={Boolean(bestDetection)} /> : step<questions.length ? <><div className="progress-track"><div style={{width:`${(step+1)/questions.length*100}%`}}/></div><div className="question-area"><span className="question-index">{String(step+1).padStart(2,'0')} <i> / {String(questions.length).padStart(2,'0')}</i></span><h2>{questions[step].title}</h2><p>{questions[step].hint}</p>{questions[step].type==='location' ? (
  <div className="location-step-container">
    <div className="location-input-row">
      <input
        type="text"
        className="location-text-input"
        aria-label="Postal code, city, or address"
        placeholder="e.g. 80331 München or Sendlinger Str. 10"
        value={locationInput}
        onChange={e => { setLocationInput(e.target.value); setLocationSearchError('') }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearchLocation() } }}
      />
      <button
        type="button"
        className="location-search-btn"
        onClick={() => handleSearchLocation()}
        disabled={isSearchingLocation || !locationInput.trim()}
      >
        {isSearchingLocation ? 'Searching…' : 'Find data ↗'}
      </button>
    </div>
    <div className="location-presets">
      <span className="presets-label">Quick select:</span>
      {['80331 München', '10115 Berlin', '50667 Köln', '20095 Hamburg'].map(preset => (
        <button
          key={preset}
          type="button"
          className="preset-chip"
          onClick={() => { setLocationInput(preset); handleSearchLocation(preset) }}
        >
          {preset}
        </button>
      ))}
    </div>
    {publicData && (
      <div className="location-preview-card">
        <div className="lp-header">
          <span className="lp-badge">✓ Public Data Found</span>
          <strong>{publicData.formattedAddress ?? publicData.city}</strong>
        </div>
        <LocationMapPreview
          address={publicData.formattedAddress ?? publicData.city ?? locationInput}
          coordinates={publicData.coordinates}
        />
        <div className="lp-grid">
          <div className="lp-item">
            <small>DIN EN 12831 Outdoor Temp</small>
            <span>{publicData.climate?.designOutdoorTempC}°C ({publicData.climate?.matchedCity})</span>
          </div>
          <div className="lp-item">
            <small>Grid Operator (§14a EnWG)</small>
            <span>{publicData.grid?.dsoName} (Guaranteed connection)</span>
          </div>
          <div className="lp-item">
            <small>Subsidies Available</small>
            <span>
              KfW 458: {publicData.subsidies?.federalBasePercent}% base
              {publicData.subsidies?.regionalBonusPercent ? ` + ${publicData.subsidies.regionalBonusPercent}% municipal` : ''}
            </span>
          </div>
        </div>
      </div>
    )}
    <div className="location-skip-row">
      <button type="button" className="skip-step-btn" onClick={handleSkipLocation}>
        Skip this step (use German national averages: -12.0°C baseline) →
      </button>
    </div>
    {locationSearchError && <p className="field-error" role="alert">{locationSearchError}</p>}
  </div>
) : questions[step].type==='choice'?<div className="choice-grid">{questions[step].choices?.map(c=><button key={c.value} type="button" className={`choice ${String(values[questions[step].key])===c.value?'selected':''}`} onClick={()=>{if(questions[step].key==='pipe_system'){const answer=clearPipeEstimateOnChange({pipe_system:values.pipe_system as 'two-pipe'|'single-pipe'|'unknown',pipeSystemSource:values.pipeSystemSource as 'user'|'estimated'|'unknown'},c.value as 'two-pipe'|'single-pipe'|'unknown');setValues(v=>({...v,...answer}));setAnswered(current=>new Set(current).add('pipe_system'));setError('');setPipeEvidence({});setHelperOpen(false);setStep(s=>s+1);return}const isInsulation=questions[step].key==='facadeInsulated'||questions[step].key==='roofInsulated';setAnswer(questions[step].key,isInsulation?(c.value==='unknown'?'unknown':c.value==='true'):c.value)}}><span className="choice-icon">⌁</span><strong>{c.label}</strong><span className="radio"/></button>)}</div>:<><label className="answer-field"><input aria-label={questions[step].title} type="range" min={questions[step].min} max={questions[step].max} step={questions[step].type==='year'?1:questions[step].key==='heatedFloorAreaM2'?5:500} value={Number(values[questions[step].key]??questions[step].min)} onChange={e=>setAnswer(questions[step].key,Number(e.target.value))}/><strong>{Number(values[questions[step].key]).toLocaleString()} <small>{questions[step].unit}</small></strong></label>{questions[step].type==='year'&&<input className="year-input" aria-label="Enter construction year" type="number" min="1800" max={new Date().getFullYear()} value={Number(values.constructionOrRenovationYear)} onChange={e=>setAnswer(questions[step].key,Number(e.target.value))}/>}</>}{questions[step].key==='pipe_system'&&<button className="photo-helper-link" onClick={()=>setHelperOpen(true)}>Not sure? Take a picture of your heater and we'll check it and give our best estimate.</button>}{error&&<p className="field-error" role="alert">{error}</p>}</div><div className="wizard-footer"><button className="text-button" onClick={()=>step===0?setStarted(false):setStep(s=>s-1)}>← &nbsp;{step===0?'Back':'Previous'}</button><span>Your answers stay on this device</span><button className="button-primary" onClick={()=>step===0?handleContinueLocation():goForward()}>{step===0?(publicData?'Continue with location →':locationInput.trim()?'Find & Continue →':'Skip & Continue →'):step===questions.length-1?'See my assessment':'Continue'} <span>→</span></button></div></>:<div className="complete-state"><div className="complete-icon">✓</div><span className="eyebrow">THANK YOU</span><h2>Your home snapshot is ready.</h2><p>We’ve gathered your details and prepared your assessment below.</p><button className="text-button" onClick={()=>{setStarted(false);setStep(0)}}>Start over</button></div>}</div>}</section>
}

export const answerLabel = (value: unknown): string | undefined => typeof value === 'boolean' ? value ? 'Yes' : 'No' : typeof value === 'string' ? labels[value] ?? value : typeof value === 'number' ? String(value) : undefined
