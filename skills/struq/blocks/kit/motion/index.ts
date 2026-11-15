// components/struq/kit/motion/index.ts (Struq recipe)
// The motion primitives: the house moves with the craft built in (reduced motion, cleanup, descender-safe masks, no
// layout shift), timed by the site's temperament (../feel, data-temperament on <body>). Use these instead of writing
// GSAP for a reveal, a block rising, a wipe, a curtain, a link hover, a button press or a scroll-drawn line.
export { FOLLOW_FINE, FOLLOW_INLINE, FollowFrame } from "./FollowFrame";
export { HoverLink } from "./HoverLink";
export { ImageCurtain } from "./ImageCurtain";
export { MaskWipe } from "./MaskWipe";
export { Pressable } from "./Pressable";
export { RevealText } from "./RevealText";
export { Rise, riseFrom, riseTo } from "./Rise";
export { ScrubLine } from "./ScrubLine";
export { Track } from "./Track";
