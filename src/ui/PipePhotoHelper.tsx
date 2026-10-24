import { useState } from 'react'
import type { HeaterPhoto } from '../core/types'
import type { PipeTypeData } from '../core/modules/pipeType'

type Props = {
  photos: HeaterPhoto[]
  pipeResult?: PipeTypeData
  unclear: boolean
  onUpload: (files: FileList | null) => Promise<void>
  onRemove: (photo: HeaterPhoto) => void
  onBack: () => void
  onContinue: () => void
  canContinue: boolean
}

type PhotoStep = 'upload' | 'processing' | 'results'

export const PipePhotoHelper = ({ photos, pipeResult, unclear, onUpload, onRemove, onBack, onContinue, canContinue }: Props) => {
  const [photoStep, setPhotoStep] = useState<PhotoStep>(photos.length ? 'results' : 'upload')

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setPhotoStep('processing')
    await onUpload(files)
    setPhotoStep('results')
  }

  return (
    <>
      <div className="progress-track"><div style={{ width: '100%' }} /></div>
      {photoStep === 'upload' && <div className="question-area photo-helper-screen">
        <span className="question-index">PHOTO HELPER · 1 / 2</span>
        <h2>Take a picture of the heater connection</h2>
        <p>Choose one or more photos of the heater or radiator connection.</p>
        <label className="photo-upload">Choose or capture photos<input type="file" accept="image/*" capture="environment" multiple onChange={event => void upload(event.target.files)} /></label>
        {photos.length > 0 && <div className="photo-list">{photos.map(photo => <article className="photo-check compact-photo" key={photo.id}>
          <img src={photo.url} alt="Selected heater connection" />
          <span>{photo.name}</span>
          <button type="button" className="photo-remove" aria-label={`Remove ${photo.name}`} onClick={() => onRemove(photo)}>×</button>
        </article>)}</div>}
      </div>}

      {photoStep === 'processing' && <div className="question-area photo-processing" role="status" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <span className="eyebrow">PHOTO CHECK</span>
        <h2>Preparing your photo</h2>
        <p>Creating a clear view of the heater connection…</p>
        <div className="processing-progress"><span /></div>
      </div>}

      {photoStep === 'results' && <div className="question-area photo-results-screen">
        <span className="question-index">PHOTO HELPER · 2 / 2</span>
        <h2>Your photo assessment</h2>
        <p>Review the image and pipe system estimate below.</p>
        <div className="photo-results-list">{photos.map(photo => <article className="photo-result-card" key={photo.id}>
          <div className="photo-result-image-wrap">
            <img className={photo.highlightedUrl ? 'photo-highlighted' : ''} src={photo.kind === 'not-heater' ? photo.url : photo.highlightedUrl ?? photo.url} alt="Heater connection assessment" />
            {photo.highlightStatus === 'loading' && <span className="image-loading"><span className="loading-spinner small" />{photo.highlightMessage}</span>}
            <button type="button" className="photo-remove" aria-label={`Remove ${photo.name}`} title="Remove photo" onClick={() => onRemove(photo)}>×</button>
          </div>
          <div className="photo-result-copy">
            <span className="eyebrow">{photo.name}</span>
            <h3>{photo.label}</h3>
            <p className="photo-confidence">{Math.round(photo.confidence * 100)}% confidence</p>
            <ul>{photo.evidence.map(item => <li key={item}>{item}</li>)}</ul>
            {photo.kind === 'not-heater' && <p className="field-error">This doesn't look like a photo of a heater. Please retake it.</p>}
          </div>
        </article>)}</div>
        {pipeResult && <section className="photo-assessment-summary"><span className="eyebrow">PIPE SYSTEM RESULT</span><h3>{pipeResult.pipe_system === 'single-pipe' ? 'Likely single-pipe' : pipeResult.pipe_system === 'two-pipe' ? 'Two-pipe · low risk' : 'Pipe type unclear'}</h3><p><strong>Risk level:</strong> {pipeResult.riskLevel}</p><p>{pipeResult.basis}</p>{pipeResult.source === 'estimated' && <p className="estimate-note">This is an estimate and should be verified on site.</p>}{unclear && <p className="unclear-note">Heating pipe system unclear from the photos. A technician should check whether this is a single-pipe system, because that can require a higher flow temperature.</p>}</section>}
        <button type="button" className="text-button add-photo-button" onClick={() => setPhotoStep('upload')}>＋ Add or retake a photo</button>
      </div>}

      <div className="wizard-footer">
        <button className="text-button" onClick={onBack}>← &nbsp;Back to pipe type</button>
        {photoStep === 'upload' ? <span>Photos stay in memory for this session</span> : <span />}
        {photoStep === 'results' && <button disabled={!canContinue} className="button-primary" onClick={onContinue}>Continue <span>→</span></button>}
      </div>
    </>
  )
}
