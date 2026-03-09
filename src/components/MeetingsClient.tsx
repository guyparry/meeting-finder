'use client'

import { useState, useMemo } from 'react'
import type { Meeting, Source, AttendanceOption } from '@/types/meeting'
import { MeetingCard } from './MeetingCard'
import { useUserLocation } from '@/hooks/useUserLocation'
import { haversineKm } from '@/lib/geo'

const DAYS = [
  { label: 'Måndag', value: 1 },
  { label: 'Tisdag', value: 2 },
  { label: 'Onsdag', value: 3 },
  { label: 'Torsdag', value: 4 },
  { label: 'Fredag', value: 5 },
  { label: 'Lördag', value: 6 },
  { label: 'Söndag', value: 0 },
]

const DAY_NAMES = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag']

const SOURCES: Source[] = ['AA', 'ACA', 'CA']

const ATTENDANCE: { label: string; value: AttendanceOption }[] = [
  { label: 'Fysiskt', value: 'in_person' },
  { label: 'Online', value: 'online' },
  { label: 'Telefon', value: 'phone' },
]

type SortMode = 'day' | 'proximity'

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function FilterButton({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'
      }`}
    >
      {children}
    </button>
  )
}

/** Returns the next N upcoming meeting occurrences relative to now (Stockholm time). */
function getUpcomingMeetings(meetings: Meeting[], count: number): Meeting[] {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }),
  )
  const todayDay = now.getDay() // 0=Sun
  const todayMinutes = now.getHours() * 60 + now.getMinutes()

  function minutesUntil(m: Meeting): number {
    const [h, min] = m.time.split(':').map(Number)
    const meetingMinutes = h * 60 + min
    let dayDiff = (m.day - todayDay + 7) % 7
    if (dayDiff === 0 && meetingMinutes <= todayMinutes) dayDiff = 7
    return dayDiff * 1440 + meetingMinutes
  }

  return [...meetings]
    .filter(m => m.attendanceOption === 'in_person' || m.attendanceOption === 'online')
    .sort((a, b) => minutesUntil(a) - minutesUntil(b))
    .slice(0, count)
}

export function MeetingsClient({ meetings }: { meetings: Meeting[] }) {
  const [search, setSearch] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [attendance, setAttendance] = useState<AttendanceOption[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('day')

  const { location, requestLocation, clearLocation } = useUserLocation()
  const hasLocation = location.status === 'granted'
  const userLat = hasLocation ? location.lat : undefined
  const userLng = hasLocation ? location.lng : undefined

  const distanceMap = useMemo(() => {
    if (!hasLocation || userLat === undefined || userLng === undefined) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const m of meetings) {
      if (m.latitude != null && m.longitude != null) {
        map.set(m.id, haversineKm(userLat, userLng, m.latitude, m.longitude))
      }
    }
    return map
  }, [meetings, hasLocation, userLat, userLng])

  const upcoming = useMemo(() => getUpcomingMeetings(meetings, 3), [meetings])

  const filtered = useMemo(() => {
    return meetings.filter(m => {
      if (days.length > 0 && !days.includes(m.day)) return false
      if (sources.length > 0 && !sources.includes(m.source)) return false
      if (attendance.length > 0 && !attendance.includes(m.attendanceOption)) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !m.name.toLowerCase().includes(q) &&
          !(m.address?.toLowerCase().includes(q)) &&
          !(m.location?.toLowerCase().includes(q)) &&
          !(m.region?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [meetings, days, sources, attendance, search])

  const grouped = useMemo(() => {
    if (sortMode === 'proximity' && hasLocation) {
      const sorted = [...filtered].sort((a, b) => {
        const da = distanceMap.get(a.id) ?? Infinity
        const db = distanceMap.get(b.id) ?? Infinity
        return da - db
      })
      return [{ day: -1, label: 'Närmast dig', meetings: sorted }]
    }

    const map = new Map<number, Meeting[]>()
    for (const m of filtered) {
      if (!map.has(m.day)) map.set(m.day, [])
      map.get(m.day)!.push(m)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.time.localeCompare(b.time))
    }
    return DAYS
      .map(d => ({ day: d.value, label: d.label, meetings: map.get(d.value) ?? [] }))
      .filter(g => g.meetings.length > 0)
  }, [filtered, sortMode, hasLocation, distanceMap])

  const activeFilters =
    days.length + sources.length + attendance.length + (search ? 1 : 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Upcoming meetings panel */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Kommande möten
          </span>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleTimeString('sv-SE', {
              timeZone: 'Europe/Stockholm',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {upcoming.map(m => (
            <div key={m.id} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400 w-7 shrink-0">{DAY_NAMES[m.day].slice(0, 3)}</span>
              <span className="font-mono text-gray-700 shrink-0">{m.time}</span>
              <span className="text-gray-900 truncate">{m.name}</span>
              {m.attendanceOption === 'online' && (
                <span className="text-xs text-amber-600 shrink-0">Online</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {location.status === 'idle' && (
          <button
            onClick={requestLocation}
            className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-6.268 8-12a8 8 0 10-16 0c0 5.732 8 12 8 12z" />
            </svg>
            Hitta närmaste möte
          </button>
        )}

        {location.status === 'requesting' && (
          <span className="text-sm text-gray-400">Hämtar din plats…</span>
        )}

        {location.status === 'granted' && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-green-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-6.268 8-12a8 8 0 10-16 0c0 5.732 8 12 8 12z" />
              </svg>
              Din plats är aktiv
            </span>
            <div className="flex gap-1">
              <FilterButton active={sortMode === 'day'} onClick={() => setSortMode('day')}>
                Per dag
              </FilterButton>
              <FilterButton active={sortMode === 'proximity'} onClick={() => setSortMode('proximity')}>
                Närmast
              </FilterButton>
            </div>
            <button
              onClick={() => { clearLocation(); setSortMode('day') }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Rensa plats
            </button>
          </div>
        )}

        {location.status === 'denied' && (
          <span className="text-sm text-red-500">{location.message}</span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-4">
        <input
          type="search"
          placeholder="Sök möte, plats, stad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dag</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(d => (
              <FilterButton
                key={d.value}
                active={days.includes(d.value)}
                onClick={() => setDays(toggle(days, d.value))}
              >
                {d.label}
              </FilterButton>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Program</span>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => (
                <FilterButton
                  key={s}
                  active={sources.includes(s)}
                  onClick={() => setSources(toggle(sources, s))}
                >
                  {s}
                </FilterButton>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Format</span>
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE.map(a => (
                <FilterButton
                  key={a.value}
                  active={attendance.includes(a.value)}
                  onClick={() => setAttendance(toggle(attendance, a.value))}
                >
                  {a.label}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        {activeFilters > 0 && (
          <button
            onClick={() => { setSearch(''); setDays([]); setSources([]); setAttendance([]) }}
            className="text-xs text-gray-400 hover:text-gray-600 self-start"
          >
            Rensa filter ({activeFilters})
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} möten{activeFilters > 0 ? ' (filtrerade)' : ''}
      </p>

      {grouped.length === 0 ? (
        <p className="text-gray-400 text-sm">Inga möten matchar din sökning.</p>
      ) : (
        grouped.map(group => (
          <div key={group.day} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              {group.day === -1 ? group.label : DAY_NAMES[group.day]}
            </h2>
            {group.meetings.map(m => (
              <MeetingCard
                key={m.id}
                meeting={m}
                distance={distanceMap.get(m.id)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
