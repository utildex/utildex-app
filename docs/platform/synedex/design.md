# Synedex Design Contract

This is the target design contract for Synedex. The app is still in its initial setup branch, so existing screens may not fully comply yet. New Synedex work should move toward this contract and should not copy Utildex tool patterns when they make the experience feel like a productivity dashboard.

This document is specific to Synedex and must not be applied to Utildex or other host applications.

## Product Identity

Synedex is a calm, modular cognitive training environment. It hosts independent mental games as consistent, accessible, focused practice experiences.

Synedex should feel like:

- a calm mental training studio
- a focused cognitive playground
- a modular library of small brain exercises
- a private, local-first practice space
- a supportive place for repetition, recovery, and improvement

Prioritize:

- calm over excitement
- clarity over decoration
- practice over performance
- guidance over configuration
- consistency over game-specific cleverness
- accessibility over visual flair
- player confidence over feature exposure

Avoid UI that feels overly technical, dashboard-like, competitive by default, noisy, arcade-like, clinically sterile, unfinished, or developer-facing.

## Platform And Game Boundaries

Synedex owns the platform shell and shared UX patterns.

The platform controls:

- navigation into and out of games
- game library presentation
- game cards and launch flows
- standard game menu structure
- standard lifecycle, pause, result, and progress patterns
- app-level theming
- accessibility expectations
- empty, loading, and error states
- boundaries between player UI and developer/debug UI

Individual games control:

- core play mechanic
- board, canvas, or game surface
- game-specific input controls
- scoring and difficulty rules
- game-specific settings
- result metrics

A game should feel like a module inserted into Synedex, not a separate mini-app with unrelated navigation, copy, or visual language.

## Visual Tone

Synedex may use an ambient cognitive or cosmic identity, but gameplay must remain legible and grounded.

Use the strongest atmosphere on welcome screens, game discovery, empty library states, and small brand moments. Reduce atmosphere on active gameplay, forms, settings, and result screens that require careful reading.

Gameplay should feel stable, quiet, tactile, and visually anchored. The game surface should be the dominant object on a game page.

Preferred qualities:

- soft
- precise
- structured
- calm
- modular
- trustworthy
- lightly playful

Avoid excessive glow, saturated neon as the primary aesthetic, low-contrast text, decoration that competes with the game, large empty panels without purpose, and developer-tool visual language in player flows.

## Theme Direction

Synedex supports light and dark modes as first-class experiences.

Dark mode is a low-stimulation focus environment. Use calm dark surfaces, clear but soft separation, restrained accents, muted support text, and strong enough grid/board contrast for puzzle clarity. Do not turn dark mode into a neon cockpit.

Light mode should feel like a warm study desk or paper-like practice surface. Use warm page surfaces, clear white or near-white game areas, readable text, soft borders, and gentle accents. Avoid sterile medical white and toy-like color treatment.

Concrete token values should come from the existing Synedex theme system and should be standardized separately as implementation matures.

## Layout Principles

Every screen needs a clear visual anchor.

- Game page: the game surface is the anchor.
- Library page: the game list/grid is the anchor.
- Result page: the result summary and recommended next action are the anchor.

Use a consistent Synedex page container. Avoid extreme width, vast empty space around important UI, and huge cards with sparse content. Keep primary content visually centered or intentionally balanced.

For game pages:

- desktop: game surface dominant, controls beside or below as secondary
- tablet: surface centered, controls compact and nearby
- mobile: surface uses available width carefully, frequent controls stay reachable, advanced settings move into drawers or dialogs

## Player-Facing Rules

The default path should be obvious. A player should not need to configure much before play.

Player-facing surfaces may show:

- resume or start actions
- difficulty or mode selection
- short explanation of what the game trains
- current progress or resume state
- settings that affect play
- calm feedback and results

Player-facing surfaces must not show:

- runtime tests
- internal validators
- raw storage state
- debug dashboards
- implementation details
- developer-only labels
- scaffold copy

Developer tools belong behind development-only gates, explicit debug routes, or dev builds.

## Controls And Actions

Buttons should express hierarchy clearly:

- primary: safest next action
- secondary: useful alternative
- tertiary/ghost: navigation or low-emphasis action
- destructive: reset, clear, delete, abandon

Only one primary action should dominate a local section. Destructive actions should not sit directly beside primary play actions without separation.

Prefer labels such as Start game, Resume, Continue, Try again, New session, Restart, Pause, Hint, Check, Settings, and Back to games. Use explicit destructive labels such as Reset puzzle, Clear progress, or End session.

Game controls should stay close to the game surface and be grouped by intent: play input, assistance, session controls, settings.

## Settings

Synedex has app-level settings elsewhere. Game settings are scoped to the current game and should not duplicate global settings unless there is a strong game-specific reason.

Use predictable setting groups:

- Difficulty
- Session
- Input
- Assistance
- Feedback
- Accessibility
- Advanced

Settings should use player language, not implementation language. Advanced player settings may exist, but they are not developer tools.

## Feedback And Progress

Feedback should be immediate, calm, and informative. A wrong move in a game is not a system failure, so avoid alarming visuals for normal mistakes.

Progress should be personal and trend-based. Prefer sessions completed, time practiced, streaks, personal best, accuracy trend, completion trend, difficulty reached, and comfort level.

Avoid global ranking, harsh scoring, competitive comparison, medical claims, and diagnosis-like interpretation.

## Language

The UI tone is supportive, concise, and practical.

Prefer:

- Practice complete
- Try again
- Continue training
- You improved your best time
- This trains working memory
- Good for a short focus session

Avoid:

- You failed
- Poor brain score
- Treats ADHD
- Clinical improvement
- Runtime self-test scaffold
- Debug generated seed state

Synedex may mention cognitive benefits carefully, but must not overclaim medical outcomes.

## Accessibility

Accessibility is part of the Synedex brand. Every game must consider keyboard access, visible focus, contrast, readable type, touch target size, reduced motion, color-independent meaning, screen-reader labels, non-timed alternatives when possible, and pause support for timed games.

Contributors should document accessibility considerations for every game.

## Motion

Motion should be subtle and functional. Use it for state transitions, completion acknowledgment, focus guidance, and gentle feedback. Avoid motion that distracts during gameplay, creates pressure, interferes with reading or input, is required to understand the UI, or ignores reduced-motion preferences.

## Anti-Patterns

Do not ship player-facing screens that expose runtime tests, raw data tabs, developer dashboards, raw storage inspection, implementation-specific scoring tools, debug-only seed/state controls, scaffolding labels, or unfinished placeholder descriptions.

Do not design game screens as generic tool pages. Do not copy Utildex layouts directly when they create a productivity-dashboard feeling. Do not place too many actions beside the game surface. Do not make the game board, canvas, or primary interaction area visually secondary. Do not use decoration to compensate for missing structure.

## Desired End State

A user should experience Synedex as a coherent, calm, modular app where every game feels independent in mechanic but consistent in structure.

The final experience should communicate:

- this is a private, calm place to practice mental skills
- games are modular, but the experience is consistent
- the UI helps me focus
- progress is supported without pressure
- nothing developer-facing leaks into the player experience
