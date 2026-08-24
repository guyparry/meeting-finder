import type { Meeting } from '../types/meeting.ts'
import { haversineKm } from './geo.ts'

export function getMeetingMinutes(meeting: Pick<Meeting, 'day' | 'time'>, now: Date): number {
  const stockholmNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }))
  const [hours, minutes] = meeting.time.split(':').map(Number)
  const meetingMinutes = hours * 60 + minutes
  const todayDay = stockholmNow.getDay() // 0=Sun

  let dayOffset = (meeting.day - todayDay + 7) % 7
  const nowMinutes = stockholmNow.getHours() * 60 + stockholmNow.getMinutes()

  if (dayOffset === 0 && meetingMinutes <= nowMinutes) {
    dayOffset = 7
  }

  return dayOffset * 24 * 60 + meetingMinutes - nowMinutes
}

export function scoreNextClosestMeeting(
  meeting: Pick<Meeting, 'day' | 'time' | 'latitude' | 'longitude'>,
  now: Date,
  userLat: number,
  userLng: number,
): number {
  if (meeting.latitude == null || meeting.longitude == null) return Number.POSITIVE_INFINITY

  const minutesUntil = getMeetingMinutes(meeting, now)
  const distanceKm = haversineKm(userLat, userLng, meeting.latitude, meeting.longitude)

  return minutesUntil + distanceKm * 60
}

export function getNextClosestMeeting(
  meetings: Meeting[],
  userLat?: number,
  userLng?: number,
  now: Date = new Date(),
): Meeting | null {
  if (userLat == null || userLng == null) return null

  return [...meetings]
    .filter(m => m.latitude != null && m.longitude != null)
    .sort((a, b) => {
      const aScore = scoreNextClosestMeeting(a, now, userLat, userLng)
      const bScore = scoreNextClosestMeeting(b, now, userLat, userLng)
      return aScore - bScore
    })[0] ?? null
}
