# Floks
This will be the counterpart Kloks but for the frontend components. This will store the canonical frontend elements that we will use in our Skipo projects. 

## FrnlTS architecture

Floks is the canonical concrete frontend element library built on FrnlTS. FrnlTS provides the semantic UI runtime; Floks provides concrete reusable elements and their visual behavior.

- React components are the only concrete component model.
- FrnlTS owns state, state-resolved events, themes, and lifecycle semantics.
- Components may render children or compose other components without acquiring a second runtime category.

FrnlTS is consumed as the published @dinilmusick/frnlts package. Floks owns the concrete UI vocabulary; FrnlTS owns the semantic model.
