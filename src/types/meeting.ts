export type Source = 'AA' | 'ACA' | 'CA'
export type AttendanceOption = 'in_person' | 'online' | 'phone'

export interface Meeting {
  id: string
  source: Source
  name: string
  day: number // 0=Sunday, 1=Monday, ..., 6=Saturday
  time: string // HH:MM 24h
  endTime?: string
  address?: string
  formattedAddress?: string
  location?: string
  latitude?: number
  longitude?: number
  types: string[]
  attendanceOption: AttendanceOption
  language?: string
  region?: string
  email?: string
  phone?: string
  conferenceUrl?: string
  notes?: string
  accessible?: boolean
  sourceUrl?: string
}
