# Floks & FrnlTS Semantic Integration Architecture

## 1. Executive Summary & Architectural Role

Floks is the **concrete visual vocabulary** and component library for the Ultrst ecosystem.  
FrnlTS (`@dinilmusick/frnlts`) is the **authoritative semantic frontend runtime and contract framework**.

```
┌────────────────────────────────────────────────────────┐
│                        Skipo                           │
│           (Application & Orchestration Layer)          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                        Floks                           │
│     (Concrete Visual Vocabulary, Themes & Styling)      │
└───────────────────────────┬────────────────────────────┘
                            │ (implements semantic contracts)
                            ▼
┌────────────────────────────────────────────────────────┐
│                       FrnlTS                           │
│   (Authoritative Semantic Runtime, Store & Contracts)  │
└────────────────────────────────────────────────────────┘
```

Floks **does not define its own parallel semantic entity system**. The legacy classes (such as `UIElementBase` and `ButtonModel`) are marked as `@deprecated` legacy compatibility wrappers. FrnlTS contracts (`FrnlPrimitive`, `FrnlComposite`, `FrnlSlot`, and `createFrnlStore`) are the single source of truth for all semantic state, entity identification, slot occupancy, and lifecycle boundaries.

---

## 2. The Semantic Boundary

FrnlTS defines two and only two primary semantic entity categories:
1. **UI Primitive**: Owns bounds, visual assets, properties, states, and events. Directly renders concrete host elements (e.g., `<button>`, `<div>`).
2. **UI Composite**: Owns named slots, properties, states, and coordination flows. It contains **no visual assets directly**; all visual content is projected through its child **Slots**.

### Mapping to Concrete Floks Elements

| Semantic Entity | Floks Implementation | Concrete Representation | Semantic Contract |
| :--- | :--- | :--- | :--- |
| **UI Primitive** | `ButtonParent` | Native HTML `<button>` | `data-frnl-kind="ui-primitive"`, registered in `FrnlStore.entities` |
| **UI Composite** | `SplitButton` | Composite container `<div role="group">` | `data-frnl-kind="ui-composite"`, registered in `FrnlStore.entities` |
| **Slot** | Named Slots (`.primary`, `.dropdown`, `.menu`) | Slot mounting node `<div data-frnl-kind="slot">` | Lives in Composite, holds single Primitive/Composite occupant |

```
Frnl Primitive
      │
      ▼
Simple Concrete Floks Element (ButtonParent)
      │
      ▼
Native Host `<button>` with Tailwind styles & token palette


Frnl Composite
      │
      ▼
Complex Concrete Floks Element (SplitButton)
      │
      ├── Slot: primary action   ──▶ contains ButtonParent (Primitive)
      ├── Slot: dropdown action  ──▶ contains ButtonParent (Primitive)
      └── Slot: contextual menu  ──▶ contains Menu / Dialog (Composite)
```

---

## 3. Semantic Identity & Anonymous Collision Prevention

To guarantee semantic integrity across multi-instance rendering:
- Reusable elements accept an explicit `id?: string` prop.
- When `id` is omitted, Floks automatically derives a deterministic, unique identity using `React.useId()`.
- Two anonymous buttons side by side (e.g. `<ButtonParent>Save</ButtonParent> <ButtonParent>Save</ButtonParent>`) receive distinct unique runtime IDs (e.g. `floks.button.save.r0` and `floks.button.save.r1`), preventing store collisions and state contamination.

---

## 4. Event Boundary: Native React Handlers as Adapters

In the current React rendering layer:
- Concrete DOM events (e.g., `onClick`, `onMouseEnter`, `onFocus`) execute on host elements.
- Native React handlers serve as the **React-side adapter** bridging native DOM interactions to the Frnl semantic boundary.
- For semantic-level state transitions (e.g., toggling `active`, `disabled`, or switching slot occupants), updates are dispatched directly to the active `FrnlStore`, triggering Zod-validated `entity.stateChanged`, `entity.propertyChanged`, or `slot.occupantChanged` events into `store.events`.

---

## 5. Store Architecture & Context Injection

Floks provides three levels of access to the Frnl semantic runtime:
1. `floksFrnlStore`: The default canonical singleton store instance.
2. `getFloksFrnlStore()`: The global getter returning the canonical store.
3. `FrnlStoreProvider`: The context provider for application-level isolation (recommended for testing, multi-tenant sub-trees, or micro-frontends).
4. `useFloksFrnlStore()`: Hook used by all Floks components that transparently prefers the nearest `FrnlStoreProvider` context and gracefully falls back to `floksFrnlStore`.

---

## 6. Deprecation of Parallel Semantic Architectures

The historical `UIElementBase` class tracing to `@kloks/state-graph`'s `GraphEntityParent` is retained strictly for backward compatibility. It must not be extended for new components. All new and refactored components must directly consume FrnlTS primitives (`FrnlPrimitive`, `FrnlComposite`, `FrnlSlot`).
