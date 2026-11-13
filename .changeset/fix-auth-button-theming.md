---
"@ultrst-armada/floks": patch
---

Fix discoloured auth tab buttons and accent border color in dark theme.

- AuthPage: replace unstyled raw button elements with explicit Skipo design tokens for active/inactive tab states
- frnlButton: correct accent variant border fallback from hardcoded cyan to themed border color
- tokens: add --skipo-accent-contrast CSS variable for gold accent button borders
