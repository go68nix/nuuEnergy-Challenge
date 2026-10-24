import { z } from 'zod'

export const buildingSchema = z.object({
  fuelType: z.enum(['gas_m3', 'gas_kwh', 'heating_oil_l']),
  annualConsumption: z.coerce.number().positive('Annual consumption must be greater than 0'),
  occupants: z.coerce
    .number()
    .int('Occupants must be a whole number')
    .min(1, 'Occupants must be at least 1'),
  constructionOrRenovationYear: z.coerce
    .number()
    .int('Year must be a whole number')
    .min(1800, 'Year looks too old')
    .max(new Date().getFullYear(), 'Year cannot be in the future'),
  heatedFloorAreaM2: z.coerce.number().positive('Heated floor area must be greater than 0'),
})

export type BuildingSchema = z.infer<typeof buildingSchema>
