---
name: PushApp Adaptive Framework
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#404943'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#707973'
  outline-variant: '#bfc9c1'
  surface-tint: '#2c694e'
  primary: '#0f5238'
  on-primary: '#ffffff'
  primary-container: '#2d6a4f'
  on-primary-container: '#a8e7c5'
  inverse-primary: '#95d4b3'
  secondary: '#2b6485'
  on-secondary: '#ffffff'
  secondary-container: '#a3d8fe'
  on-secondary-container: '#255f80'
  tertiary: '#713638'
  on-tertiary: '#ffffff'
  tertiary-container: '#8d4d4e'
  on-tertiary-container: '#ffcfce'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b1f0ce'
  primary-fixed-dim: '#95d4b3'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#0e5138'
  secondary-fixed: '#c7e7ff'
  secondary-fixed-dim: '#98cdf2'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#064c6b'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#ffb3b3'
  on-tertiary-fixed: '#390b0e'
  on-tertiary-fixed-variant: '#6f3537'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
  growth-green: '#2D6A4F'
  calm-blue: '#457B9D'
  warm-surface: '#FDFCFB'
  urgent-amber: '#D68C45'
  text-main: '#1F292E'
  text-muted: '#63737B'
  ai-bubble: '#F1F3F2'
  user-chip: '#FFFFFF'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  chip-label:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The design system is anchored in the concept of "Mature Growth." It moves away from the frantic, high-dopamine patterns of traditional habit trackers, opting instead for a **Warm Minimalist** aesthetic. The goal is to create a digital environment that feels like a professional coaching studio: quiet, focused, and deeply supportive.

The style avoids all forms of "juvenile gamification." There are no mascots, badges, or faux-currencies. Instead, progression is visualized through elegant data visualization, clean typography, and a "People-First" social layer. The UI should evoke a sense of reliability and innovation, positioning the AI not as a gimmick, but as a sophisticated, invisible partner in the user's personal transformation.

**Key Visual Principles:**
- **Clarity over Clutter:** Every screen answers exactly one primary question.
- **Human Connection:** Real people (Allies and Circles) are treated as first-class UI elements, never tucked away in menus.
- **Adaptive Resilience:** The UI should feel "soft" rather than "rigid," mirroring the coach’s philosophy of adjusting to life’s setbacks rather than punishing them.

## Colors

The palette is designed to be "Soothing Professional." We utilize **Growth Green** as our primary driver for action and momentum, balanced by a **Calm Blue** for stability and trust. 

Instead of stark whites and harsh blacks, the design system uses a **Warm Surface** neutral base. This reduces eye strain and provides a "paper-like" warmth that feels more mature and high-end. 

- **Primary (Growth Green):** Used for primary buttons, progress indicators, and active journey states.
- **Secondary (Calm Blue):** Used for social elements, community features, and the "Support Circle."
- **Urgent Amber:** A sophisticated, non-alarming shade used specifically for "Today's Focus" tasks that must be completed to maintain a streak.
- **Neutral:** A range of warm greys and off-whites to distinguish between the coach's dialogue bubbles and the interface background.

## Typography

This design system uses **Inter** for all levels. Inter was selected for its exceptional legibility in both English and Hebrew, ensuring a seamless RTL (Right-to-Left) experience. 

The typographic hierarchy is "Flat and Clear." We avoid excessive weight variations, relying on scale and color to drive the user's eye. 

- **Headlines:** Set with tighter letter-spacing to feel "contained" and professional.
- **Body Text:** Increased line-height (1.5x) to ensure the coach's advice feels breathable and easy to digest.
- **RTL Considerations:** When rendering Hebrew, the font weight remains consistent, but line-height is monitored to ensure diacritics and taller characters do not overlap. 
- **The "Dream" Style:** Aspirations (Dreams) should always use `headline-md` to maintain their status as high-level, inspiring objects.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for mobile devices. It utilizes a 4-column system with a 20px safe-margin on the horizontal edges.

**Spacing Rhythm:**
- We use an 8px base grid.
- **The "Focus" Block:** The "Today's Focus" area at the top of the Home screen uses `lg` (24px) padding to create a distinct island of urgency.
- **Conversational Spacing:** Message bubbles in the Coach view are spaced with `xs` (4px) within groups and `md` (16px) between different speakers to maintain the flow of dialogue.
- **Vertical Hierarchy:** Large sections (Home, Journeys, Community) are separated by `xl` (32px) to prevent the "wall of text" feeling.

**RTL Adaptation:**
All horizontal spacing, margins, and gutters are mirrored. Padding-left becomes padding-right to support Hebrew reading patterns naturally.

## Elevation & Depth

To maintain a mature and calm atmosphere, the design system avoids heavy shadows and floating layers. Instead, we use **Tonal Layers** supplemented by **Ambient Shadows**.

- **Surface Levels:**
  - **Level 0 (Background):** Using the `warm-surface` color.
  - **Level 1 (Cards/Containers):** Pure white background with a very soft, diffused shadow (Blur: 15px, Opacity: 4%, Color: Text-Main).
  - **Level 2 (Active/Urgent):** Slightly higher elevation with a subtle tint of `growth-green` in the shadow to suggest "Priority."

- **AI Distinction:**
  The coach's conversation bubbles are "pressed" into the surface (flat, muted grey background), while user response chips are "elevated" (white with a shadow), signaling that they are the actionable elements. This prevents the user from confusing AI questions with their own choices.

## Shapes

The shape language is **Rounded (Level 2)**. This strikes a balance between "Modern Professional" and "Warmly Approachable."

- **Standard Elements:** 8px (0.5rem) corner radius. Used for cards, task blocks, and community feed items.
- **Interactive Elements:** Buttons and Input Chips use a more pronounced 12px or 16px radius to feel tactile and inviting.
- **AI Bubbles:** The coach's speech bubbles use 16px rounding, but the corner pointing to the "source" is sharpened to 4px to indicate the speaker.
- **Progress Bars:** These should always have fully rounded (pill-shaped) ends to emphasize "Fluidity" and "Momentum" rather than "Completion/Ending."

## Components

### Buttons
- **Primary:** Solid `growth-green` with white text. High contrast, 16px rounding.
- **Secondary:** Ghost style with a `text-main` border and clear background. Used for "Invite Ally" or "Edit" actions.
- **Urgent Action:** Solid `urgent-amber`. Reserved exclusively for the "Today's Focus" task button.

### Cards
Cards are the primary organizational unit. They must have a subtle white background and soft ambient shadow. 
- **Journey Card:** Contains the Dream name (label-caps), Journey name (headline-sm), and a frequency-based progress bar (e.g., "2 of 3 this week").
- **Social Card:** Features a small, high-quality circular avatar of the friend/ally, a brief status, and a single large "Cheer" or "Nudge" button.

### AI Chat Interface
- **Coach Bubbles:** Left-aligned (Right-aligned for Hebrew), `ai-bubble` background, no shadow.
- **User Answer Chips:** These appear at the bottom of the screen. They are white with a shadow. When "Multiple Choice" is enabled, they feature a small green checkmark on selection.
- **Voice Input:** A dedicated, prominent circular button next to the text input field, styled with a soft pulse animation to indicate it is ready to listen.

### Progress & Momentum
- **The Streak:** Displayed at the top of Home. It uses a clean, bold numerical display. If an Urgent task is pending, the streak icon pulsates gently in `urgent-amber`.
- **XP/Breadth Bar:** A thin, sophisticated progress bar at the very top of the screen that fills as more parallel Journeys are sustained. It uses a gradient of `growth-green` to `calm-blue`.

### Input Fields
Minimalist styling. No heavy borders. Use a single bottom stroke or a very light `warm-surface` fill. Focus states are indicated by a 2px `growth-green` bottom border.