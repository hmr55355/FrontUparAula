export type ParentRelationship =
  | 'padre'
  | 'madre'
  | 'abuelo'
  | 'abuela'
  | 'tio'
  | 'tia'
  | 'hermano'
  | 'hermana'
  | 'acudiente_otro'

export interface ParentGuardian {
  id: number
  first_name: string
  last_name: string
  relationship: ParentRelationship
  phone: string
  phone_alt: string | null
  email: string | null
  is_primary_contact: boolean
}

export const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  padre: 'Padre',
  madre: 'Madre',
  abuelo: 'Abuelo',
  abuela: 'Abuela',
  tio: 'Tío',
  tia: 'Tía',
  hermano: 'Hermano',
  hermana: 'Hermana',
  acudiente_otro: 'Otro acudiente',
}
