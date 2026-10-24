import { useState } from 'react'
import { buildingSchema } from '../core/schema'
import type { BuildingInput, FuelType } from '../core/types'

type BuildingFormProps = {
  onSubmitBuilding: (building: BuildingInput) => void
}

const initialValues = {
  fuelType: 'gas_m3' as FuelType,
  annualConsumption: '',
  occupants: '',
  constructionOrRenovationYear: '',
  heatedFloorAreaM2: '',
}

export const BuildingForm = ({ onSubmitBuilding }: BuildingFormProps) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<string[]>([])

  return (
    <section className="card">
      <h2>Manual building input</h2>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          const result = buildingSchema.safeParse(values)
          if (!result.success) {
            setErrors(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`))
            return
          }

          setErrors([])
          onSubmitBuilding(result.data)
        }}
      >
        <label>
          Fuel type
          <select
            value={values.fuelType}
            onChange={(event) => setValues((current) => ({ ...current, fuelType: event.target.value as FuelType }))}
          >
            <option value="gas_m3">Gas (m3)</option>
            <option value="gas_kwh">Gas (kWh)</option>
            <option value="heating_oil_l">Heating oil (L)</option>
          </select>
        </label>
        <label>
          Annual consumption
          <input
            type="number"
            value={values.annualConsumption}
            onChange={(event) => setValues((current) => ({ ...current, annualConsumption: event.target.value }))}
          />
        </label>
        <label>
          Number of occupants
          <input
            type="number"
            value={values.occupants}
            onChange={(event) => setValues((current) => ({ ...current, occupants: event.target.value }))}
          />
        </label>
        <label>
          Construction or renovation year
          <input
            type="number"
            value={values.constructionOrRenovationYear}
            onChange={(event) =>
              setValues((current) => ({ ...current, constructionOrRenovationYear: event.target.value }))
            }
          />
        </label>
        <label>
          Heated floor area (m2)
          <input
            type="number"
            value={values.heatedFloorAreaM2}
            onChange={(event) => setValues((current) => ({ ...current, heatedFloorAreaM2: event.target.value }))}
          />
        </label>
        <div className="photo-placeholder">
          <strong>Photo upload (placeholder)</strong>
          <p>Not implemented yet.</p>
        </div>
        <button type="submit">Run assessment</button>
      </form>
      {errors.length > 0 && (
        <ul className="error-list">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  )
}
