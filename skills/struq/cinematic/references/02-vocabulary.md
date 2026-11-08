# Vocabulary for Cinematic Web Experiences

Use these terms to make direction specific. Each definition includes the practical question it answers.

## Experience structure

### Experience thesis
A one-paragraph statement of what the viewer does, how the world responds, and how the emotional intensity develops. It prevents the project from becoming an effect collection.

### Persistent stage
A viewport-bound visual layer that remains alive while several narrative chapters manipulate its state.

### Chapter
A controlled interval of experience state with a purpose, local progress, key poses, interaction envelope, and handoff.

### Sequence
A group of related beats that produces one perceptual action, such as entering a product interior.

### Beat
A meaningful event the viewer can perceive: a word lands, the camera settles, a shape locks into place, or a light reveals a feature.

### Cue
A named timeline position or condition that starts a beat.

### Key pose
A deliberately authored state of camera, subject, type, lighting, and atmosphere. Timelines interpolate between key poses.

### Hold
An interval where major motion reduces so the viewer can understand, read, or feel the composition.

### Accent
A brief increase in motion, contrast, sound, scale, or deformation used to emphasize a beat.

### Anticipation
A preparatory motion that signals an upcoming action, such as a small pullback before a fast push-through.

### Overshoot
A motion passing slightly beyond its final value before resolving. It creates energy but should match the material and tone.

### Resolution
The settling state after a transformation or handoff.

### Scroll-distance budget
The physical amount of scroll allocated to a chapter or sequence, commonly expressed in viewport heights.

### Progress segmentation
Dividing local progress into named phase windows, for example entrance `0.00 to 0.18`, development `0.18 to 0.65`, and handoff `0.82 to 1.00`.

### Narrative density
The number of meaningful visual changes per unit of scroll or time. Excess density produces fatigue and weakens emphasis.

### Rhythm
The pattern of motion, holds, accents, and changes in intensity across the experience.

### Pacing
How quickly narrative information and visual transformations progress.

## Continuity and transitions

### Handoff
The interval in which state ownership transfers from one chapter to another.

### Handoff contract
The written specification for outgoing state, incoming state, shared properties, overlap, ownership, occlusion, reverse behavior, and completion.

### Bridge element
An object, word, line, mask, light, texture, or camera relationship that exists on both sides of a transition.

### State continuity
The requirement that a shared property's outgoing final state equals the incoming initial state.

### Spatial carry
Continuing an object's trajectory while its context changes.

### Match cut
Aligning shape, composition, scale, direction, or motion between outgoing and incoming states.

### Occlusion wipe
Passing an object or surface in front of the camera so a state change can occur behind it.

### Foreground wipe
Using a DOM or WebGL foreground layer to cover and reveal the viewport.

### Camera pass-through
Moving the camera through or extremely close to geometry to hide a scene change or create spatial continuity.

### Portal transition
Displaying another state or scene through a mask, aperture, material, or render target.

### Morphological handoff
Transforming one vector or mesh form into the principal form of the next chapter.

### Typography bridge
Using a word, glyph, line, or typographic block as the persistent transition object.

### Light bridge
Beginning the incoming chapter's lighting before its geometry or content is fully revealed.

### Texture bridge
Using the outgoing render or visual surface as a texture in the incoming state.

### World-space continuity
Maintaining an object's spatial relationship in the 3D world across a transition.

### Screen-space continuity
Maintaining a visual element's position or trajectory relative to the viewport, even if its world transform changes.

### Transition cover
A visual condition that makes a discontinuous state change invisible, such as full occlusion, motion blur, darkness, or a fast macro pass.

## Timeline language

### Master timeline
The high-level timeline that composes chapter and handoff timelines. It should coordinate rather than contain every raw tween.

### Chapter timeline
A timeline responsible for the authored state changes within one chapter.

### Handoff timeline
A timeline responsible specifically for ownership transfer and bridge continuity between chapters.

### Child timeline
A reusable timeline inserted into a parent timeline.

### Semantic label
A named timeline point such as `camera:commit` or `handoff:occluded`.

### Relative positioning
Placing a tween relative to a label or previous action instead of at an unexplained absolute time.

### Overlap
Starting one beat before another has fully resolved.

### Stagger
Offsetting related elements. A stagger should communicate reading order, direction, hierarchy, or material behavior rather than being applied by default.

### Scrub
Mapping scroll progress to a timeline playhead.

### Smoothing
Reducing abrupt changes in a signal. Lenis smoothing, ScrollTrigger scrub smoothing, and manual damping should be assigned intentionally rather than stacked without control. Pair them: lower the Lenis lerp, lower the scrub number, and use `scrub: true` for attached layers and a small number for floating ones.

### Easing
The mathematical shape of a known transition between values.

### Damping
Continuous convergence toward a moving target, commonly used for pointer and camera reaction.

### Dead zone
An input range that produces no visual response, useful for preventing jitter.

### Hysteresis
Different thresholds for entering and leaving a state, preventing rapid state flicker around a boundary.

### Snap point
A target progress or chapter state toward which the scroll position may settle.

### Critical interval
A phase where the authored narrative must dominate and reactive effects should attenuate.

## Camera and composition

### Blocking
Planning where the camera and subjects exist and how they move through space.

### Staging
Directing attention using composition, depth, scale, light, type, and movement.

### Establishing shot
A shot that gives spatial or conceptual context.

### Hero shot
The clearest, most iconic presentation of the principal subject.

### Insert shot
A focused detail shot used to reveal a feature or clue.

### Macro shot
An extreme close-up that emphasizes texture, material, or transition geometry.

### Resolution shot
The final composition that settles the chapter or experience.

### Dolly
Moving the camera forward or backward.

### Truck
Moving the camera horizontally.

### Pedestal
Moving the camera vertically.

### Pan
Rotating the camera left or right.

### Tilt
Rotating the camera up or down.

### Roll
Rotating around the camera's forward axis.

### Orbit
Moving around a subject while maintaining a target relationship.

### Crane move
A composed vertical and spatial camera movement.

### Push-in
A deliberate move toward the subject to increase attention or intensity.

### Pull-out
A move away from the subject to reveal context or release tension.

### Zoom
Changing focal length or field of view. It is visually different from moving the camera.

### Dolly zoom
Combining camera movement with an opposing field-of-view change to alter perceived depth.

### Rack focus
Changing focus distance between depth planes.

### Parallax reveal
Using relative movement between near and far layers to reveal depth or content.

### Camera target
The point or target rig the camera aims toward. Author it alongside position.

### Look-ahead
A target offset based on movement direction or velocity that anticipates where the viewer is going.

### Composition safe area
A screen region reserved for type, controls, or responsive cropping.

### Visual axis
The dominant directional line through a composition or sequence.

### Vanishing point
The perspective convergence point that can be used to guide camera and typography motion.

## Three.js and transform systems

### Scene graph
The hierarchy of objects whose local transforms combine into world transforms.

### Rig
A parent transform created to own one category of movement.

### Narrative rig
A rig controlled by authored chapter or handoff timelines.

### Interaction rig
A child rig controlled by pointer, hover, drag, or device input.

### Procedural rig
A rig controlled by elapsed time, noise, simulation, or idle animation.

### Placement rig
A rig used for chapter-level positioning and composition.

### Model root
The imported asset root. Keep authored placement separate from internal model animation whenever possible.

### Camera rig
A transform hierarchy that separates narrative movement, interaction, shake, and the physical camera.

### Local space
Coordinates relative to an object's parent.

### World space
Coordinates after the full scene-graph hierarchy is resolved.

### Screen space
Coordinates relative to the viewport.

### Anchor
A named transform or point used for camera targets, DOM alignment, attachments, or transitions.

### Proxy object
A plain JavaScript object whose numeric values are animated by GSAP and then applied to WebGL uniforms or composed state.

### Render target
A texture destination for rendered output, used for portals, cross-scene transitions, feedback, reflections, and compositing.

### Post-processing pass
A full-screen effect applied after scene rendering, such as bloom, depth of field, distortion, color grading, or grain.

### Shader uniform
A value passed to shader code, commonly used for time, progress, pointer, velocity, color, and transition state.

## Input and interaction

### Input ownership
The rule that assigns each input to a category of behavior.

### Input arbitration
Resolving conflicts when several inputs could affect the same experience state.

### Interaction envelope
The states or progress range in which an interaction is available and how its influence fades in or out.

### Interaction gating
Reducing or disabling an interaction during a critical narrative interval.

### Macro interaction
An input that changes chapter or primary state, usually scroll, click, drag, or route navigation.

### Micro interaction
A local response that supports feedback or tactility without changing the narrative state.

### Magnetic response
A controlled attraction toward a pointer or target.

### Inertial response
Continued movement after input changes.

### Velocity mapping
Converting input velocity into a visual parameter using clamping, normalization, easing, and decay.

### Intent detection
Distinguishing deliberate navigation from incidental input.

### Gesture lock
Temporarily assigning control to one direction or interaction mode after intent is detected.

## Quality and implementation

### Direction data
Centralized, editable values that describe shots, timings, transforms, materials, and interaction strengths.

### Tuning harness
Development controls used to inspect, scrub, isolate, slow, and capture experience states.

### Vertical slice
One complete chapter and handoff implemented across DOM, WebGL, interaction, responsive behavior, and cleanup.

### Performance tier
A capability category used to select effects and asset quality.

### Graceful degradation
Replacing an expensive mechanism while preserving the intended composition and narrative.

### Reduced-motion choreography
An intentionally authored version that reduces spatial travel, velocity, and parallax while retaining hierarchy and continuity.

### Frame budget
The available processing time per frame. At 60 Hz, the total frame duration is approximately 16.7 ms, including browser work.

### Draw call
A rendering submission to the GPU. Excessive draw calls can limit performance even when geometry is simple.

### Overdraw
Rendering multiple layers over the same pixels, common with transparent particles and full-screen post effects.

### Lifecycle cleanup
Killing timelines and ScrollTriggers, removing ticker callbacks and listeners, disposing WebGL resources, and restoring document state on unmount or route change.

## Better direction phrases

Replace vague wording with observable behavior.

Instead of:

> Make the hero more cinematic.

Use:

> Hold the subject in a low-contrast silhouette for the first 12% of progress. Between 0.12 and 0.28, push the camera from `heroWide` to `heroThreeQuarter`, raise the key light from 0.2 to 1.0, and reveal the title by line with an 80 ms directional stagger. Let the camera settle 150 ms before the final line reaches full opacity.

Instead of:

> Add a smooth transition.

Use:

> Use the circular product aperture as a bridge. From 0.78 to 0.90, align it to the viewport center and reduce pointer influence. From 0.86 to 1.00, dolly through the aperture while the incoming environment begins rendering behind it. Swap the environment only after the aperture covers at least 94% of the viewport.

Instead of:

> Pin every section.

Use:

> Keep the visual stage viewport-locked across chapters 1 to 4. Use semantic document regions as scroll ranges, but preserve the same canvas, camera rig, central subject, lighting hierarchy, and transition state throughout.
