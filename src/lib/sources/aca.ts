import type { Meeting, AttendanceOption } from '@/types/meeting'

const ACA_BASE = 'https://aca-sverige.org'
const ACA_REST = `${ACA_BASE}/wp-json/wp/v2/mote`

// Taxonomy ID → day number (0=Sunday)
const DAG_MAP: Record<number, number> = {
  34: 1, // Måndag
  35: 2, // Tisdag
  36: 3, // Onsdag
  37: 4, // Torsdag
  38: 5, // Fredag
  39: 6, // Lördag
  40: 0, // Söndag
}

// Taxonomy ID → attendance option
const MOTESTYP_MAP: Record<number, AttendanceOption> = {
  67: 'in_person',
  68: 'online',
  69: 'phone',
}

interface ACAPost {
  id: number
  title: { rendered: string }
  link: string
  dag: number[]
  motestyp: number[]
}

interface ACAPageDetails {
  time?: string
  endTime?: string
  address?: string
  location?: string
  email?: string
  phone?: string
}

function normaliseTime(t: string): string {
  return t.replace('.', ':').padStart(5, '0')
}

async function scrapeACAPage(url: string): Promise<ACAPageDetails> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return {}
    const html = await res.text()
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    // Time: "kl. 18:00 – 19:00" or "kl. 18.00-19.00"
    const timeMatch = text.match(/kl[.\s]+(\d{1,2}[.:]\d{2})\s*[-–—]\s*(\d{1,2}[.:]\d{2})/)
    const time = timeMatch ? normaliseTime(timeMatch[1]) : undefined
    const endTime = timeMatch ? normaliseTime(timeMatch[2]) : undefined

    // Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    const email = emailMatch?.[0]

    // Swedish phone number
    const phoneMatch = text.match(/(?:\+46|0)[\d\s-]{8,12}/)
    const phone = phoneMatch?.[0]?.trim()

    // Address: Swedish postal pattern (street + number + optional postcode)
    const addressMatch = text.match(
      /[A-ZÅÄÖ][a-zåäö]+(?:gatan|vägen|gränd|plan|torg|allén|stigen|platsen|esplanaden|promenaden)\s+\d+[a-zA-Z]?(?:[,\s]+\d{3}\s*\d{2})?(?:[,\s]+[A-ZÅÄÖ][a-zåäö]+)?/
    )
    const address = addressMatch?.[0]?.trim()

    // Location/venue name — look for text after "Lokal:" or in proximity
    const locationMatch = text.match(/(?:Lokal|Plats|Venue|Location)[:\s]+([A-ZÅÄÖ][^,.\n]{3,40})/i)
    const location = locationMatch?.[1]?.trim()

    return { time, endTime, address, location, email, phone }
  } catch {
    return {}
  }
}

async function fetchWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit = 5
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

export async function fetchACAMeetings(): Promise<Meeting[]> {
  const res = await fetch(
    `${ACA_REST}?per_page=100&_fields=id,title,link,dag,motestyp`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) throw new Error(`ACA list fetch failed: ${res.status}`)
  const posts: ACAPost[] = await res.json()

  const details = await fetchWithConcurrency(posts, async (post) => {
    const detail = await scrapeACAPage(post.link)
    return { post, detail }
  }, 5)

  return details
    .map(({ post, detail }): Meeting | null => {
      const dagId = post.dag[0]
      const typId = post.motestyp[0]
      const day = dagId !== undefined ? DAG_MAP[dagId] : undefined

      if (day === undefined) return null

      return {
        id: `aca-${post.id}`,
        source: 'ACA',
        name: post.title.rendered,
        day,
        time: detail.time ?? '00:00',
        endTime: detail.endTime,
        address: detail.address,
        location: detail.location,
        types: [],
        attendanceOption: typId !== undefined ? MOTESTYP_MAP[typId] ?? 'in_person' : 'in_person',
        email: detail.email,
        phone: detail.phone,
        sourceUrl: post.link,
      }
    })
    .filter((m): m is Meeting => m !== null)
}
