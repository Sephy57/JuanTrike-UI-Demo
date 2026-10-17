# Driver Navigation Demo

## Driver flow

The driver route presents a synthetic online driver, waiting offer, selected pickup and destination, route geometry, and trip status. A driver can accept or decline an offer. Acceptance advances the shared booking/demo state; declining lets the dispatcher simulation search for another synthetic profile or reach its configured terminal state. Offers are not sent to real drivers.

`src/booking/movement.ts` derives the active route and simulated vehicle position from booking state and route progress. The marker advances along the drawn polyline. A single demo clock in `src/booking/DemoContext.tsx` advances both booking state and vehicle progress; pause, resume, speed changes, and reset apply consistently. The presentation panel exposes these controls without creating a second timer.

The driver screen can recenter on a foreground GPS fix. Emulator-origin fixes remain marked simulated. When an active route or vehicle point lies outside the bundled mapped city outline, the screen surfaces that state instead of implying city coverage.

Offer Accept/Decline and the current lifecycle action remain in a pinned bottom bar outside the scrollable route/profile details. This keeps the time-limited response and next trip action reachable without scrolling.

## What the map does not provide

This is a route-preview and trip-progress simulation, not turn-by-turn navigation. There are no voice instructions, lane guidance, live traffic, closures, rerouting, driver device telemetry, real-time dispatch, or proof that the road is legally usable by a tricycle. Route geometry comes from the local general-road graph; when the graph cannot connect the endpoints, the route is visibly classified as illustrative.

## Presentation sequence

1. Open the driver screen and show the simulated driver marker and offer state.
2. Accept the offer; point out the pickup route and shared clock.
3. Pause and resume the clock, then raise speed for a short visible movement interval.
4. Decline an offer in a reset scenario to show the search flow.
5. Show the mapped-city outline and the simulated/route-source labels. Avoid describing the demo as live dispatch or turn-by-turn navigation.

## Test coverage

The booking, dispatch, route geometry, route layer, demo-context and city-boundary Jest suites verify deterministic transitions and shared route state. Device acceptance results, including the build and emulator evidence, are recorded separately in `ANDROID_ACCEPTANCE_RESULTS.md`.
