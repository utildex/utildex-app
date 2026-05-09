# Synedex Game Lifecycle

Every Synedex game should follow the same high-level lifecycle:

```text
Discover -> Prepare -> Play -> Pause -> Complete -> Reflect -> Continue
```

Games may omit steps that do not apply, but they should not invent unrelated flow patterns without a clear reason.

## Discover

Users browse or search available games.

A game card should quickly answer:

- what the game is
- what it trains
- expected session duration
- available difficulty or mode type
- whether the user can resume

Use tags for cognitive domains or play style, such as Logic, Memory, Focus, Language, Pattern recognition, Relaxed, Timed, and Short session. Avoid implementation tags such as runtime, scaffold, algorithm, test, or debug.

## Prepare

Before play, show only the choices needed to start well.

Common preparation options:

- start new session
- resume previous session
- choose difficulty
- choose mode
- choose session length, when relevant

The primary action should be obvious. Do not expose debug tools, raw data, runtime tests, internal validators, or developer-only controls in preparation UI.

## Play

During play:

- the game surface is primary
- controls are minimal and close to the surface
- feedback is immediate but calm
- errors are understandable, not alarming
- advanced settings are available but not prominent
- player progress is visible only when it helps focus

The primary game surface should not scroll away during normal play unless the game is designed around scrolling.

## Pause

Pause should feel calm and simple.

A pause state may offer:

- resume
- restart
- settings
- exit to game menu

Avoid performance judgment during pause unless the game requires it.

## Complete

Completion should provide closure.

A result screen should show:

- primary result
- session summary
- personal progress or trend, when available
- one recommended next action
- secondary actions such as retry, change difficulty, or return to games

Completion copy should frame the session as practice, not as judgment.

## Reflect

Synedex frames performance as practice data.

Prefer metrics such as time practiced, accuracy, personal best, streak, completion trend, difficulty reached, or focus time. Avoid opaque scores unless they are explained in plain language.

## Continue

The user should always have a clear next step.

Recommended next actions can include:

- repeat this level
- continue journey
- try a shorter session
- increase difficulty
- return to games

Avoid leaving users at a dead end after completion.

## Standard Screen Model

Use this model unless a game has a strong reason to differ:

```text
Game entry:
- title
- one-sentence player promise
- resume/start actions
- difficulty or mode
- short training tags

Play:
- game surface first
- primary input controls adjacent
- session feedback secondary
- settings behind one entry point

Complete:
- result summary
- one recommended next action
- secondary actions
```
