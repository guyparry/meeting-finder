import type { Meeting, AttendanceOption } from '@/types/meeting'

const AA_URL = 'https://www.aa.se/wp-json/aa/v1/groups'

const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

interface AAMeetingSlot {
  time: string
  type: { name: string; id: string }
}

interface AAResponse {
  pages: number
  total_results: number
  groups: AAGroup[]
}

interface AAGroup {
  ID: number
  title: string
  coordinates: { lat: number; lng: number } | null
  address: string
  place: string
  language: { name: string; id: string }
  accessible: boolean
  online: boolean
  email: string
  phone: string
  information: string
  meeting_link: string
  division: string
  meetings: {
    days: Record<string, Array<AAMeetingSlot | null>>
  }
}

async function fetchAllGroups(): Promise<AAGroup[]> {
  const first = await fetch(AA_URL, { next: { revalidate: 3600 } })
  if (!first.ok) throw new Error(`AA fetch failed: ${first.status}`)
  const firstData: AAResponse = await first.json()

  const remaining = Array.from({ length: firstData.pages - 1 }, (_, i) =>
    fetch(`${AA_URL}?page=${i + 2}`, { next: { revalidate: 3600 } })
      .then(r => r.json() as Promise<AAResponse>)
      .then(d => d.groups)
  )
  const restGroups = (await Promise.all(remaining)).flat()

  return [...firstData.groups, ...restGroups]
}

export async function fetchAAMeetings(): Promise<Meeting[]> {
  const groups = await fetchAllGroups()
  const meetings: Meeting[] = []

  for (const group of groups) {
    for (const [dayName, slots] of Object.entries(group.meetings.days)) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]
        if (!slot) continue
        const day = DAY_MAP[dayName]
        if (day === undefined) continue

        const attendanceOption: AttendanceOption = group.online ? 'online' : 'in_person'

        meetings.push({
          id: `aa-${group.ID}-${dayName}-${i}-${slot.time}`,
          source: 'AA',
          name: group.title,
          day,
          time: slot.time,
          address: group.address || undefined,
          location: group.place || undefined,
          latitude: group.coordinates?.lat,
          longitude: group.coordinates?.lng,
          types: [slot.type.id],
          attendanceOption,
          language: group.language?.name || 'Svenska',
          region: group.division || undefined,
          email: group.email || undefined,
          phone: group.phone || undefined,
          conferenceUrl: group.meeting_link || undefined,
          notes: group.information || undefined,
          accessible: group.accessible,
        })
      }
    }
  }

  return meetings
}
