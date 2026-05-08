# Synedex Game Module Contract

This document defines the UX and metadata expectations for games contributed to Synedex. It complements the technical registry instructions in [README.md](./README.md).

## Required Metadata

Each game must provide enough metadata for Synedex to render a consistent game library and launch flow.

Required fields:

- game name
- short player-friendly description
- cognitive domains trained
- expected session length
- supported input methods
- difficulty or mode model
- scoring model
- result metrics
- game-specific settings
- accessibility notes
- resume support
- pause support

Recommended cognitive domain tags:

- Logic
- Memory
- Focus
- Language
- Pattern recognition
- Spatial reasoning
- Processing speed
- Relaxed
- Timed
- Short session

Avoid tags based on implementation details, such as runtime, debug, test, scaffold, or algorithm.

## Game Entry Requirements

The game entry/preparation screen should include:

- title
- short description
- what the game trains
- current progress or resume state
- primary action
- secondary action
- difficulty or mode selection
- optional game-specific settings entry

The entry screen should not include runtime tests, internal validators, raw storage state, seed/debug controls, implementation details, contributor notes, or developer-only tabs.

## Play Requirements

The play screen should include:

- dominant game surface
- nearby primary input controls
- compact status and feedback
- pause or exit control
- settings entry point
- accessible labels and visible focus states

Frequent controls must be reachable and predictable. Touch input should not require precision beyond typical mobile comfort. Keyboard interaction should be supported where appropriate.

## Settings Requirements

Game settings must be scoped to the current game. Do not duplicate app-level settings such as theme unless there is a strong game-specific reason.

Use these groups when relevant:

- Difficulty
- Session
- Input
- Assistance
- Feedback
- Accessibility
- Advanced

Settings must be written in player language. Advanced player settings are allowed, but developer/debug controls are not player settings.

## Result Requirements

Completion should route to a result or reflection state unless the game is intentionally endless.

Result screens should include:

- primary result
- session summary
- personal progress or trend, when available
- one recommended next action
- secondary actions

Use supportive language. Avoid global ranking, harsh judgment, medical claims, or diagnosis-like interpretation.

## Accessibility Requirements

Each game must document:

- keyboard support
- touch support
- screen-reader strategy
- focus model
- color-independent meaning
- reduced-motion behavior
- pause or non-timed alternatives, when relevant
- known limitations

Accessibility notes should live with the game design spec and be revisited before release.

## Developer Tool Boundary

Developer tools must not appear in normal player flows.

Allowed locations:

- development-only routes
- dev builds
- explicit debug modes guarded by environment checks
- local QA documentation

Disallowed in player UI:

- runtime tests
- internal scoring validators
- raw storage inspection
- implementation-specific performance tools
- debug seed/state controls, unless deliberately framed as an advanced player feature

## Contributor Rule

A contributor should implement the game mechanic and game-specific UX only. They should not implement unrelated navigation, global theming, custom page shells, or platform-level patterns unless the Synedex platform contract explicitly asks for them.
