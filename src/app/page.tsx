import { MeetingsClient } from '@/components/MeetingsClient'
import { fetchAAMeetings } from '@/lib/sources/aa'
import { fetchCAMeetings } from '@/lib/sources/ca'
import { fetchACAMeetings } from '@/lib/sources/aca'

export const revalidate = 3600

async function getMeetings() {
  const [aa, ca, aca] = await Promise.allSettled([
    fetchAAMeetings(),
    fetchCAMeetings(),
    fetchACAMeetings(),
  ])
  return [
    ...(aa.status === 'fulfilled' ? aa.value : []),
    ...(ca.status === 'fulfilled' ? ca.value : []),
    ...(aca.status === 'fulfilled' ? aca.value : []),
  ]
}

export default async function Home() {
  const meetings = await getMeetings()

  const counts = {
    AA: meetings.filter(m => m.source === 'AA').length,
    ACA: meetings.filter(m => m.source === 'ACA').length,
    CA: meetings.filter(m => m.source === 'CA').length,
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-baseline justify-between">
          <h1 className="text-xl font-bold tracking-tight">Hitta ett möte</h1>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>{counts.AA} AA</span>
            <span>{counts.ACA} ACA</span>
            <span>{counts.CA} CA</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {meetings.length === 0 ? (
          <p className="text-gray-400">Kunde inte ladda möten. Försök igen senare.</p>
        ) : (
          <MeetingsClient meetings={meetings} />
        )}
      </div>
    </main>
  )
}
