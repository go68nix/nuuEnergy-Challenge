import { z } from 'zod'

export const buildingSchema = z.object({
  fuelType: z.enum(['gas_m3', 'gas_kwh', 'heating_oil_l']),
  annualConsumption: z.coerce.number().positive('Annual consumption must be greater than 0'),
  occupants: z.coerce
    .number()
    .int('Occupants must be a whole number')
    .min(1, 'Occupants must be at least 1').optional(),
  constructionOrRenovationYear: z.coerce
    .number()
    .int('Year must be a whole number')
    .min(1800, 'Year looks too old')
    .max(new Date().getFullYear(), 'Year cannot be in the future'),
  heatedFloorAreaM2: z.coerce.number().positive('Heated floor area must be greater than 0'),
  heatingDistribution: z.enum(['radiator', 'underfloor', 'mixed']).optional(),
  buildingType: z.enum(['single_two_family', 'apartment', 'end_terrace', 'mid_terrace', 'semi_detached']).optional(),
  heatingSystem: z.enum(['gas', 'oil', 'pellet', 'gas_condensing', 'oil_condensing', 'district_other']).optional(),
  facadeInsulated: z.coerce.boolean().optional(),
  roofInsulated: z.coerce.boolean().optional(),
  heatingSystemAge: z.enum(['0_9', '10_19', '20_29', '30_plus', 'unknown']).optional(),
  replacementTiming: z.enum(['immediately', '1_3_months', '3_6_months', 'over_6_months', 'not_planned']).optional(),
  winterHeatedShare: z.enum(['half', 'third', 'quarter', 'other']).optional(),
  pipe_system: z.enum(['two-pipe', 'single-pipe', 'unknown']).optional(),
  pipeSystemSource: z.enum(['user', 'estimated', 'unknown']).optional(),
  pipeSystemEvidence: z.array(z.string()).optional(),
  pipeSystemConfidence: z.coerce.number().min(0).max(1).optional(),
})

export type BuildingSchema = z.infer<typeof buildingSchema>
