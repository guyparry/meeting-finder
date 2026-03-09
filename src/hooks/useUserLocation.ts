'use client'

import { useState, useCallback } from 'react'

export type LocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'granted'; lat: number; lng: number }
  | { status: 'denied'; message: string }

export function useUserLocation() {
  const [location, setLocation] = useState<LocationState>({ status: 'idle' })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({ status: 'denied', message: 'Geolocation stöds inte av din webbläsare.' })
      return
    }
    setLocation({ status: 'requesting' })
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          status: 'granted',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      err => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Platsåtkomst nekades.'
            : 'Kunde inte hämta din plats.'
        setLocation({ status: 'denied', message })
      },
      { timeout: 10000, maximumAge: 300_000 },
    )
  }, [])

  const clearLocation = useCallback(() => {
    setLocation({ status: 'idle' })
  }, [])

  return { location, requestLocation, clearLocation }
}
