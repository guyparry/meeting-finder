import { NextResponse } from 'next/server'
import { fetchAAMeetings } from '@/lib/sources/aa'
import { fetchCAMeetings } from '@/lib/sources/ca'
import { fetchACAMeetings } from '@/lib/sources/aca'

export const revalidate = 3600

export async function GET() {
  const [aa, ca, aca] = await Promise.allSettled([
    fetchAAMeetings(),
    fetchCAMeetings(),
    fetchACAMeetings(),
  ])

  const meetings = [
    ...(aa.status === 'fulfilled' ? aa.value : []),
    ...(ca.status === 'fulfilled' ? ca.value : []),
    ...(aca.status === 'fulfilled' ? aca.value : []),
  ]

  const errors = [
    aa.status === 'rejected' ? `AA: ${aa.reason}` : null,
    ca.status === 'rejected' ? `CA: ${ca.reason}` : null,
    aca.status === 'rejected' ? `ACA: ${aca.reason}` : null,
  ].filter(Boolean)

  return NextResponse.json({ meetings, errors })
}
