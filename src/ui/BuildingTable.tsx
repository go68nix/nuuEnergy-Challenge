import type { BuildingInput } from '../core/types'

type RowError = {
  row: number
  errors: string[]
}

type BuildingTableProps = {
  buildings: BuildingInput[]
  rowErrors: RowError[]
  onSelectBuilding: (building: BuildingInput) => void
}

export const BuildingTable = ({ buildings, rowErrors, onSelectBuilding }: BuildingTableProps) => {
  return (
    <section className="card">
      <h2>Loaded buildings</h2>
      {buildings.length === 0 ? (
        <p>No valid rows loaded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fuel</th>
              <th>Annual consumption</th>
              <th>Occupants</th>
              <th>Year</th>
              <th>Heated area (m2)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building, index) => (
              <tr key={`${building.fuelType}-${index}`}>
                <td>{building.fuelType}</td>
                <td>{building.annualConsumption}</td>
                <td>{building.occupants}</td>
                <td>{building.constructionOrRenovationYear}</td>
                <td>{building.heatedFloorAreaM2}</td>
                <td>
                  <button type="button" onClick={() => onSelectBuilding(building)}>
                    Assess
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rowErrors.length > 0 && (
        <>
          <h3>Row validation errors</h3>
          <ul className="error-list">
            {rowErrors.map((error) => (
              <li key={`row-${error.row}`}>
                Row {error.row}: {error.errors.join('; ')}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
