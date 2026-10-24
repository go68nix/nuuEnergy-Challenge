import type { AssessmentModule } from '../types'

export const technicianChecklistModule: AssessmentModule = {
  id: 'technician_checklist',
  label: 'Technician checklist',
  run() {
    return {
      id: 'technician_checklist',
      label: 'Technician checklist',
      status: 'ok',
      data: {
        items: [
          'DIN EN 12831 load calculation',
          'Room-by-room sizing and hydraulic balancing',
          'Electrical capacity and Zählerschrank check',
          'Outdoor unit placement, noise, and permits',
        ],
      },
    }
  },
}
