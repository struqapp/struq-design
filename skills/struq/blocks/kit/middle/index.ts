// components/struq/kit/middle/index.ts (Struq recipe)
// The middle scenes: designed middles of a page, each with two or three variants extracted from the blocks, filled
// through typed slots. Pick a scene and a variant and fill it with the client's own words; never compose a middle from
// raw GSAP and a grid. Each renders its own data-scene root, takes a tone (ground, inverse, field), orders its parts in
// one timeline from one trigger and is timed by the site's temperament (../feel). Optional facts (hours, phone,
// address) have no defaults and render nothing when absent; a variant missing what it needs falls back in code.
export { ProcessStrip, resolveProcessVariant } from "./ProcessStrip";
export type { ProcessVariant, Step } from "./ProcessStrip";
export { PlaceHours, resolvePlaceVariant } from "./PlaceHours";
export type { PlaceDoor, PlaceVariant } from "./PlaceHours";
export { ServicesList, resolveServicesVariant, TONE_CLASS } from "./ServicesList";
export type { SceneTone, Service, ServicesVariant } from "./ServicesList";
export { daysText, hoursLines, hoursText, openStatus, wallClock } from "./hours";
export type { HoursLang, HoursRow } from "./hours";
