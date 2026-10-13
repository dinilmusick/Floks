# 04 — FLOKS THETA COMPONENT CONTRACTS

## CORE_MODEL

    FLOKS := CANONICAL UI RUNTIME + COMPONENT CONTRACT REGISTRY
    Θ := VISUAL AUTHORING CONSUMER

    FLOKS → WHAT IS THEMEABLE
    Θ → HOW IT LOOKS

## OBJECTIVES

    F1 → canonical component registry
    F2 → explicit visual contract per component
    F3 → themeable visual slots
    F4 → visual states
    F5 → visual parameters
    F6 → asset/element types
    F7 → ThemePack target binding
    F8 → Zod runtime validation
    F9 → deterministic compatibility checks

## CONTRACT

    ComponentThemeContract :=
    {
      componentId,
      componentVersion,
      slots[],
      states[],
      parameters[],
      assets[]
    }

## SLOT

    VisualSlot :=
    {
      id,
      acceptedElementTypes[],
      required,
      constraints?
    }

## STATE

    VisualState :=
    {
      id,
      parameters[],
      transitions?
    }

## PARAMETER

    VisualParameter :=
    {
      id,
      type,
      default,
      constraints?
    }

## THEME_TARGET

    ThemeTarget :=
    {
      library: "@ultrst-armada/floks",
      componentId,
      componentVersion,
      contractVersion
    }

## VALIDATION

    Validate(theme, component)
    ⇔
      Target(theme) = component
      ∧ theme.slots ⊆ component.slots
      ∧ theme.states ⊆ component.states
      ∧ theme.parameters ⊆ component.parameters
      ∧ theme.assetTypes ⊆ component.acceptedAssetTypes

## REGISTRY

    ComponentRegistry
      ↓
    ComponentThemeContract
      ↓
    ZodSchema
      ↓
    public export
      ↓
    Θ

## RUNTIME_RULE

    FLOKS runtime → consumes compiled ThemePack
    FLOKS runtime ↛ Θ runtime
    Θ → FLOKS public contracts

## ACCEPTANCE

    ∀ published ThemePack T:
      TargetLibrary(T) = FLOKS
      ∧ Validate(T, FLOKS) = PASS

## NON_GOALS

    FLOKS ↛ Theta editor logic
    FLOKS ↛ Theta graph implementation
    FLOKS ↛ arbitrary third-party component themes
