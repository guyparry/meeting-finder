import type { Meeting, AttendanceOption } from '@/types/meeting'

const CA_URL = 'https://caws-api.azurewebsites.net/api/v1/meetings-tsml?area=sweden'

interface CAMeeting {
  day: number
  url: string
  name: string
  slug: string
  time: string
  end_time: string
  notes: string
  types: string[]
  region: string
  address: string
  location: string
  latitude: string
  longitude: string
  attendance_option: 'in_person' | 'online'
  formatted_address: string
  conference_url?: string
  conference_phone?: string
}

export async function fetchCAMeetings(): Promise<Meeting[]> {
  const res = await fetch(CA_URL, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`CA fetch failed: ${res.status}`)
  const data: CAMeeting[] = await res.json()

  return data.map((m): Meeting => ({
    id: `ca-${m.slug}`,
    source: 'CA',
    name: m.name,
    day: m.day,
    time: m.time,
    endTime: m.end_time || undefined,
    address: m.address || undefined,
    formattedAddress: m.formatted_address || undefined,
    location: m.location || undefined,
    latitude: m.latitude ? parseFloat(m.latitude) : undefined,
    longitude: m.longitude ? parseFloat(m.longitude) : undefined,
    types: m.types || [],
    attendanceOption: m.attendance_option as AttendanceOption,
    region: m.region || undefined,
    conferenceUrl: m.conference_url || undefined,
    phone: m.conference_phone || undefined,
    notes: m.notes || undefined,
    sourceUrl: m.url || undefined,
  }))
}
