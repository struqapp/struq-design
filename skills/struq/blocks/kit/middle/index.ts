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
export { resolveWorkVariant, WORK_MAX, WorkIndex } from "./WorkIndex";
export type { WorkItem, WorkVariant } from "./WorkIndex";
export { GALLERY_COUNTS, GalleryRun, resolveGalleryVariant, sheetRows } from "./GalleryRun";
export type { GalleryPhoto, GalleryVariant } from "./GalleryRun";
export { priceText, ProductRow, resolveProductVariant } from "./ProductRow";
export type { Price, Product, ProductVariant, ShopDoor } from "./ProductRow";
export { Programme, resolveProgrammeVariant, sentencesOf } from "./Programme";
export type { ProgrammeDoor, ProgrammePart, ProgrammeVariant } from "./Programme";
export { resolveSubjectVariant, SubjectPlate } from "./SubjectPlate";
export type { SubjectVariant } from "./SubjectPlate";
export { entrance, entranceEach } from "./entrance";
export { daysText, hoursLines, hoursText, openStatus, wallClock } from "./hours";
export type { HoursLang, HoursRow } from "./hours";
