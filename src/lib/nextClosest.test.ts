import test from 'node:test'
import assert from 'node:assert/strict'

import { scoreNextClosestMeeting } from './nextClosest'

test('prefers a very near meeting that is later today over a farther meeting sooner in the week', () => {
  const now = new Date('2026-08-24T18:00:00+02:00')

  const nearbyLaterToday = {
    id: 'nearby-later',
    source: 'AA',
    name: 'Nearby Later',
    day: 1,
    time: '19:00',
    attendanceOption: 'in_person',
    types: [],
    latitude: 59.3293,
    longitude: 18.0686,
  }

  const fartherSooner = {
    id: 'farther-soon',
    source: 'CA',
    name: 'Farther Soon',
    day: 0,
    time: '18:00',
    attendanceOption: 'in_person',
    types: [],
    latitude: 59.5,
    longitude: 18.3,
  }

  const nearScore = scoreNextClosestMeeting(nearbyLaterToday, now, 59.3293, 18.0686)
  const farScore = scoreNextClosestMeeting(fartherSooner, now, 59.3293, 18.0686)

  assert.ok(nearScore < farScore)
})

test('rewards closeness more strongly than a small time advantage when both are close in time', () => {
  const now = new Date('2026-08-24T17:00:00+02:00')

  const veryCloseButLater = {
    id: 'close-but-later',
    source: 'AA',
    name: 'Close But Later',
    day: 1,
    time: '19:00',
    attendanceOption: 'in_person',
    types: [],
    latitude: 59.3293,
    longitude: 18.0686,
  }

  const fartherButSooner = {
    id: 'farther-but-sooner',
    source: 'CA',
    name: 'Farther But Sooner',
    day: 1,
    time: '17:30',
    attendanceOption: 'in_person',
    types: [],
    latitude: 59.4,
    longitude: 18.2,
  }

  const closeScore = scoreNextClosestMeeting(veryCloseButLater, now, 59.3293, 18.0686)
  const farScore = scoreNextClosestMeeting(fartherButSooner, now, 59.3293, 18.0686)

  assert.ok(closeScore < farScore)
})
