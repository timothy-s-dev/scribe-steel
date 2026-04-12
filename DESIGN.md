# Design System Document: Tactical Elegance

## 1. Overview & Creative North Star: "The Digital Grimoire"
The Creative North Star for this design system is **"The Digital Grimoire."** This concept bridges the gap between ancient high-fantasy aesthetics and modern tactical software. It moves away from the "cluttered parchment" trope of traditional RPG sites, instead favoring a sophisticated, editorial approach that feels like a premium, high-tech interface for a modern wizard.

The system breaks the "template" look through **intentional asymmetry** and **tonal depth**. We achieve a "tactical" feel not through heavy textures, but through precision—razor-sharp typography, ample negative space, and a layering system that mimics the physical depth of stacked glass and steel.

## 2. Colors: Steel, Embers, and Gold
The palette is rooted in a deep, atmospheric dark mode. We use a "Cold Steel" foundation with "Ember" and "Gilded" highlights to evoke the tension of a tabletop encounter.

*   **Primary (`#a5ccdf`):** A muted steel blue. Used for primary actions and focused states.
*   **Secondary (`#e8c086`):** A soft, metallic gold. Used for rewards, highlights, and legendary-tier elements.
*   **Tertiary (`#ffb3ad`):** A muted crimson. Used for critical states, health-related UI, or high-alert tactical info.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Boundaries must be defined solely through background color shifts. Use `surface-container-low` for a section sitting on a `surface` background. Let the change in value define the edge, creating a seamless, high-end "monolith" look.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Frosted Obsidian." 
*   **Base:** `surface` (`#111316`)
*   **Low-Level Containers:** `surface-container-low` (`#1a1c1f`)
*   **Interactive/Elevated Elements:** `surface-container-high` (`#282a2d`)
By nesting a `surface-container-highest` card inside a `surface-container-low` section, we create organic hierarchy without visual clutter.

### The "Glass & Gradient" Rule
To add "soul," primary CTAs should utilize a subtle linear gradient from `primary` to `primary_container`. For floating overlays (like tooltips or navigation menus), use **Glassmorphism**: 
*   **Background:** `surface_variant` at 60% opacity.
*   **Effect:** `backdrop-blur: 12px`.

## 3. Typography: The High-Contrast Script
The system uses a deliberate clash between the "Ancient" (Serif) and the "Functional" (Sans-Serif).

*   **Display & Headlines (Noto Serif):** These are your "flavor" elements. Large, high-contrast serif type evokes the feeling of a fantasy novel or a tactical manual. Use `display-lg` for hero sections to establish an editorial, "prestige" feel.
*   **Titles & Body (Manrope):** A modern, geometric sans-serif that ensures high legibility for complex RPG stats. It feels "engineered" and professional.
*   **Labels (Inter):** Specifically for micro-copy and tactical data. Inter’s high x-height makes it perfect for small-scale UI elements like spell slots or initiative counts.

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structure.

*   **The Layering Principle:** Avoid shadows for static content. Instead, "stack" surface tiers. A character sheet (Surface Container High) sits on a background (Surface), creating a natural lift.
*   **Ambient Shadows:** For floating modals or "active" cards, use "Shadow-as-Glow." Shadows must be extra-diffused (32px - 64px blur) at 6% opacity, using the `primary` color instead of black. This mimics the soft bioluminescence of a magical artifact.
*   **The "Ghost Border":** If accessibility requires a stroke, use `outline-variant` at 15% opacity. It should be barely perceptible—felt rather than seen.

## 5. Components

### Buttons
*   **Primary:** A subtle gradient from `primary` to `primary_container`. Text color is `on_primary`. Shape: `sm` (0.125rem) roundedness for a sharp, tactical edge.
*   **Secondary:** Ghost style. No background, `outline` at 20% opacity. On hover, fills with `surface_bright`.
*   **Tactical:** For "Draw Steel" specific actions, use `secondary` (Gold) to denote importance.

### Cards & Lists
*   **No Dividers:** Forbid the use of horizontal lines. Use 24px–32px of vertical white space to separate list items.
*   **Interaction:** On hover, a card should shift from `surface-container-low` to `surface-container-high` and slightly "grow" (scale: 1.02).

### Tactical Chips
*   **Variant:** Use `sm` roundedness. 
*   **Coloring:** Use `tertiary_container` for hostile traits/debuffs and `primary_container` for player-favorable stats.

### Input Fields
*   **State:** Default state uses `surface_container_highest` with no border. Focused state adds a 1px `primary` bottom-border only (Editorial style).
*   **Font:** Use `label-md` (Inter) for labels to maintain a technical feel.

### Additional Component: "The Stat Monolith"
A custom component for RPG data. A large, `surface-container-lowest` block featuring a `display-sm` (Noto Serif) number paired with a `label-sm` (Inter, All-Caps) description. This creates a bold, authoritative data visualization.

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Place a large serif headline on the left with a massive amount of "dead space" on the right to create an upscale, magazine feel.
*   **Use Color Sparingly:** 90% of the UI should be neutrals (`surface` tiers). Use your accents (`primary`, `secondary`, `tertiary`) only for interactive or vital information.
*   **Type Hierarchy:** Use `display-lg` for page titles. Don't be afraid of the size; let the typography be the "art."

### Don't:
*   **Don't use 100% Black:** Always use the `surface` token (`#111316`) to maintain depth and prevent eye strain.
*   **Don't use Rounded Corners (`full` or `xl`):** Keep roundedness to `sm` (2px) or `md` (6px). Too much rounding breaks the "tactical/steel" aesthetic and feels too friendly/consumer-grade.
*   **Don't use Dividers:** If you feel the need to add a line, add more padding instead.