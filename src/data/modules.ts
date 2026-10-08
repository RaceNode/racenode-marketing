// The modules, in the order of the app's own navigation. One list for the header menu (name + `short`) and the
// home cards (name + `summary` + the phone capture). The pages are stable URLs (scripts/guardrails.mjs).
import type { ImageMetadata } from 'astro';
import { CREW_DAYS_IN_PLANNING } from './crew-days';
import personalPhone from '../assets/screenshots/crew-app-race-weekend.png';
import managementPhone from '../assets/screenshots/management-overview-phone.png';
import logisticsPhone from '../assets/screenshots/logistics-overview-phone.png';
import timetablePhone from '../assets/screenshots/timetable-schedule-phone.png';
import planningPhone from '../assets/screenshots/planning-phone.png';

export interface Module {
  name: string;
  href: string;
  /** One line, under the name in the header menu. */
  short: string;
  /** Two or three lines on the home card: what it does, concretely. */
  summary: string;
  phone: ImageMetadata;
  phoneAlt: string;
}

export const modules: Module[] = [
  {
    name: 'Personal',
    href: '/crew-app/',
    short: "Each crew member's weekend, on their phone",
    summary: 'Role, flight, hotel, meals and the next session on each crew member\'s own phone, taken from what you already entered. Free for every team member.',
    phone: personalPhone,
    phoneAlt: "RaceNode crew app: a chief mechanic's race weekend with what is up next, his roles, his next meal and his hotel",
  },
  {
    name: 'Management',
    href: '/management/',
    short: 'Roles, racecars and meals per event',
    summary: 'Roles per car and per crew, racecar entries and meals for every event: set once, seen by the whole crew, with what is still missing before the event.',
    phone: managementPhone,
    phoneAlt: 'RaceNode Management on a phone: one item to resolve before the event, team roles, staff with a role and a meal',
  },
  {
    name: 'Logistics',
    href: '/logistics/',
    short: 'Crew travel, hotels and vehicles',
    summary: 'Flights, trains, team vehicles and hotels, room by room. Flags anyone missing a flight, a hotel or a ride, and fills bookings in from the confirmation you drop.',
    phone: logisticsPhone,
    phoneAlt: 'RaceNode Logistics on a phone: staff without departure or return travel, flagged before the event',
  },
  {
    name: 'Timetable',
    href: '/timetable/',
    short: 'The race weekend schedule, live',
    summary: 'Your team schedule alongside the official sessions, briefings set once and anchored to them, and a live countdown on the screen in your box.',
    phone: timetablePhone,
    phoneAlt: "RaceNode Timetable on a phone: the team's race weekend schedule with the time left before each item",
  },
  {
    name: 'Planning',
    href: '/crew-planning/',
    short: 'The whole season on one grid',
    summary: `Staff, racecars and trucks across the whole season on one grid, painted day by day${CREW_DAYS_IN_PLANNING ? ', with availability posted by your own crew' : ''}.`,
    phone: planningPhone,
    phoneAlt: "RaceNode Planning on a phone: a racing team's week, who is on track, travelling or at the workshop",
  },
];
