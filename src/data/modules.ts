// The modules, in the order of the app's own navigation, in the language of the page being built (getLocale()). One list for the header menu (name + `short`) and the
// home cards (name + `summary` + the captures). The pages are stable URLs (scripts/guardrails.mjs).
import type { ImageMetadata } from 'astro';
import { link, type Locale } from '@/i18n';
import { m } from '@/paraglide/messages';
import { getLocale } from '@/paraglide/runtime';
import { CREW_DAYS_IN_PLANNING } from './crew-days';
import managementPhone from '../assets/screenshots/management-overview-phone.png';
import logisticsPhone from '../assets/screenshots/logistics-overview-phone.png';
import timetablePhone from '../assets/screenshots/timetable-schedule-phone.png';
import planningPhone from '../assets/screenshots/planning-phone.png';
import managementScreen from '../assets/screenshots/management-card.png';
import logisticsScreen from '../assets/screenshots/logistics-card.png';
import timetableScreen from '../assets/screenshots/timetable-card.png';
import planningScreen from '../assets/screenshots/planning-card.png';

export interface Module {
  name: string;
  href: string;
  /** One line, under the name in the header menu. */
  short: string;
  /** Two or three lines on the home card: what it does, concretely. */
  summary: string;
  /** The app's phone screen: the card's picture on a phone. */
  phone: ImageMetadata;
  phoneAlt: string;
  /** The team manager's screen, at a desk: the card's picture from sm up. */
  screen?: ImageMetadata;
  screenAlt?: string;
}

export function modules(): Module[] {
  const locale = getLocale() as Locale;
  return [
    {
      name: m.module_management_name(),
      href: link(locale, 'management'),
      short: m.module_management_short(),
      summary: m.module_management_summary(),
      phone: managementPhone,
      phoneAlt: m.module_management_phone_alt(),
      screen: managementScreen,
      screenAlt: m.module_management_screen_alt(),
    },
    {
      name: m.module_logistics_name(),
      href: link(locale, 'logistics'),
      short: m.module_logistics_short(),
      summary: m.module_logistics_summary(),
      phone: logisticsPhone,
      phoneAlt: m.module_logistics_phone_alt(),
      screen: logisticsScreen,
      screenAlt: m.module_logistics_screen_alt(),
    },
    {
      name: m.module_timetable_name(),
      href: link(locale, 'timetable'),
      short: m.module_timetable_short(),
      summary: m.module_timetable_summary(),
      phone: timetablePhone,
      phoneAlt: m.module_timetable_phone_alt(),
      screen: timetableScreen,
      screenAlt: m.module_timetable_screen_alt(),
    },
    {
      name: m.module_planning_name(),
      href: link(locale, 'crew-planning'),
      short: m.module_planning_short(),
      summary: `${m.module_planning_summary()}${CREW_DAYS_IN_PLANNING ? m.module_planning_summary_crew_days() : ''}.`,
      phone: planningPhone,
      phoneAlt: m.module_planning_phone_alt(),
      screen: planningScreen,
      screenAlt: m.module_planning_screen_alt(),
    },
  ];
}
