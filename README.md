# Floks
This will be the counterpart Kloks but for the frontend components. This will store the canonical frontend elements that we will use in our Skipo projects. 

## FrnlTS architecture

Floks is the canonical concrete frontend element library built on FrnlTS. FrnlTS provides the semantic UI runtime; Floks provides concrete reusable elements and their visual behavior.

- UI Primitive: use for atomic elements such as a simple Button.
- UI Composite: use when an element requires multiple semantic children, Slots, coordinated state, or Flows. Complex Button variants may therefore be composites.
- Shared runtime: Floks UI assets use the canonical FrnlTS Zustand store and Frnl semantic boundaries.

FrnlTS is consumed as the published @dinilmusick/frnlts package. Floks owns the concrete UI vocabulary; FrnlTS owns the semantic model.
