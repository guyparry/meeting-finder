'use client'

import { useState, useMemo } from 'react'
import type { Meeting, Source, AttendanceOption } from '@/types/meeting'
import { MeetingCard } from './MeetingCard'

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

export function MeetingsClient({ meetings }: { meetings: Meeting[] }) {
  const [search, setSearch] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [attendance, setAttendance] = useState<AttendanceOption[]>([])

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

  // Group by day, sorted Mon–Sun
  const grouped = useMemo(() => {
    const map = new Map<number, Meeting[]>()
    for (const m of filtered) {
      if (!map.has(m.day)) map.set(m.day, [])
      map.get(m.day)!.push(m)
    }
    // Sort each day's meetings by time
    for (const [, list] of map) {
      list.sort((a, b) => a.time.localeCompare(b.time))
    }
    // Order days Mon(1)–Sun(0)
    return DAYS
      .map(d => ({ day: d.value, label: d.label, meetings: map.get(d.value) ?? [] }))
      .filter(g => g.meetings.length > 0)
  }, [filtered])

  const activeFilters =
    days.length + sources.length + attendance.length + (search ? 1 : 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-4">
        {/* Search */}
        <input
          type="search"
          placeholder="Sök möte, plats, stad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />

        {/* Day */}
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

        {/* Source + Attendance */}
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

        {/* Clear */}
        {activeFilters > 0 && (
          <button
            onClick={() => { setSearch(''); setDays([]); setSources([]); setAttendance([]) }}
            className="text-xs text-gray-400 hover:text-gray-600 self-start"
          >
            Rensa filter ({activeFilters})
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {filtered.length} möten{activeFilters > 0 ? ' (filtrerade)' : ''}
      </p>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <p className="text-gray-400 text-sm">Inga möten matchar din sökning.</p>
      ) : (
        grouped.map(group => (
          <div key={group.day} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              {DAY_NAMES[group.day]}
            </h2>
            {group.meetings.map(m => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
