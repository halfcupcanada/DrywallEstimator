# Drywall Estimator — Design Ideas

## Approach A — Blueprint Drafting Table
**Design Movement:** Technical Blueprint / Engineering Drafting
**Core Principles:** Precision-first, grid-anchored, monochromatic with accent pops, information density without clutter
**Color Philosophy:** Deep navy background (#0D1B2A) with white/cyan drawing lines — evokes a professional blueprint. Amber accent for active states.
**Layout Paradigm:** Full-bleed canvas center, slim collapsible side panels (not floating cards)
**Signature Elements:** Grid-dot canvas background, hairline rule borders, monospace dimension labels
**Interaction Philosophy:** Every click feels precise; cursor changes per tool; snap feedback is tactile
**Animation:** Subtle fade-in on panels; wall lines draw with a stroke-dashoffset animation
**Typography:** JetBrains Mono for dimensions/numbers, Inter for UI labels
<probability>0.08</probability>

## Approach B — Clean Construction App (CHOSEN)
**Design Movement:** Modern SaaS / Construction Tech
**Core Principles:** Light background, high contrast tools panel, clear visual hierarchy, contractor-friendly
**Color Philosophy:** Off-white canvas (#F8F9FA), slate-800 sidebar, blue-600 primary actions, orange-500 for active drawing tool
**Layout Paradigm:** Fixed left toolbar (64px icon strip), full-height center canvas, collapsible right estimate panel
**Signature Elements:** Subtle grid on canvas, thick wall strokes with endpoint handles, floating dimension badges
**Interaction Philosophy:** Tool selection is immediate; drawing is click-to-place; escape cancels
**Animation:** Wall segments animate in; panel slides; hover states on tools
**Typography:** DM Sans for UI, IBM Plex Mono for measurements
<probability>0.07</probability>

## Approach C — Dark Mode Pro Tool
**Design Movement:** Dark IDE / CAD Tool aesthetic
**Core Principles:** Dark chrome, high-contrast drawing layer, neon accent lines, power-user density
**Color Philosophy:** #1A1A2E background, #16213E panels, electric blue (#0F3460) walls, green (#00FF88) active
**Layout Paradigm:** Three-column fixed layout, canvas fills center, panels are always visible
**Signature Elements:** Glowing wall lines, animated cursor crosshair, pulsing snap indicators
**Interaction Philosophy:** Keyboard-driven shortcuts, minimal mouse travel
**Animation:** Glow effects on active elements, smooth transitions
**Typography:** Space Grotesk headings, Fira Code for numbers
<probability>0.06</probability>

---
**Selected:** Approach B — Clean Construction App
