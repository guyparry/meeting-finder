import type { Meeting } from '@/types/meeting'
import { formatDistance } from '@/lib/geo'

const SOURCE_STYLES = {
  AA: 'bg-blue-100 text-blue-800',
  ACA: 'bg-purple-100 text-purple-800',
  CA: 'bg-green-100 text-green-800',
}

const DAYS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör']

const ATTENDANCE_LABELS: Record<string, string> = {
  in_person: 'Fysiskt',
  online: 'Online',
  phone: 'Telefon',
}

export function MeetingCard({ meeting, distance }: { meeting: Meeting; distance?: number }) {
  const {
    source, name, day, time, endTime, address, formattedAddress,
    location, attendanceOption, language, region, email, phone,
    conferenceUrl, notes, accessible, sourceUrl,
  } = meeting

  const displayAddress = formattedAddress || address

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-base leading-snug">{name}</h2>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${SOURCE_STYLES[source]}`}>
          {source}
        </span>
      </div>

      {/* Day + Time */}
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-gray-700">{DAYS[day]}</span>
        <span className="text-gray-900 font-mono">
          {time}{endTime ? ` – ${endTime}` : ''}
        </span>
        {attendanceOption !== 'in_person' && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {ATTENDANCE_LABELS[attendanceOption]}
          </span>
        )}
        {accessible && (
          <span className="text-xs text-gray-400" title="Rullstolsanpassad">♿</span>
        )}
        {distance != null && (
          <span className="text-xs text-gray-400 ml-auto">{formatDistance(distance)}</span>
        )}
      </div>

      {/* Location */}
      {(displayAddress || location) && (
        <p className="text-sm text-gray-600">
          {location && <span className="font-medium">{location} — </span>}
          {displayAddress}
        </p>
      )}

      {/* Region / Language */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        {region && <span>{region}</span>}
        {language && language !== 'Svenska' && (
          <span className="bg-gray-100 px-2 py-0.5 rounded-full">{language}</span>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <p className="text-xs text-gray-500 line-clamp-2">{notes}</p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3 text-xs mt-1">
        {conferenceUrl && (
          <a href={conferenceUrl} target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline">
            Gå med online →
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
            {email}
          </a>
        )}
        {phone && !conferenceUrl && (
          <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
            {phone}
          </a>
        )}
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 hover:underline ml-auto">
            Källa
          </a>
        )}
      </div>
    </div>
  )
}
