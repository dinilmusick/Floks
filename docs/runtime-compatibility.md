# Runtime compatibility contract

| Environment | Surface | Status | Evidence / limitation |
|---|---|---|---|
| Browser | `/ui`, `/canvas-ui`, UI subpaths | Intended browser surfaces; actual browser execution required | React, XYFlow, D3 and CSS are browser-oriented dependencies. |
| Node.js | package metadata, declarations and build tooling | Import-time safety unverified | CSS and browser-only dependencies must not break Node tooling or SSR imports. |
| Cloudflare Workers | No dedicated Worker export | Unsupported / unverified | UI packages are not Worker server runtimes. |
| Build-time tooling | package build and type generation | Node.js tooling | Keep bundler, CSS processing and code-generation dependencies out of runtime entry points. |
| TypeScript consumers | root, ui, canvas-ui, contracts and named UI subpaths | Declared; clean-consumer verification required | Each export must resolve to shipped JS/CSS and declarations as applicable. |

## Boundary rules

- Browser UI exports may depend on browser-compatible React/UI packages.
- CSS exports are assets, not JavaScript entry points; do not include them in pure Node import probes.
- UI package import-time initialization must not access `window`, `document`, `navigator` or `localStorage` before a component is mounted.
- Floks UI packages must not acquire Kloks/Krnl backend implementation dependencies.
- Worker compatibility is not claimed for UI packages.

## Verification gates

Use a real browser-compatible test environment to mount representative UI and canvas components. Separately verify Node import-time safety for any subpath advertised for SSR or build tooling. Compile clean TypeScript consumers against every public UI and contracts subpath.
