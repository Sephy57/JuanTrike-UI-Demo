# JuanTrike UI Demo — Proof of Concept Overview

**Purpose.** A local, offline, clickable demonstration of how the proposed JuanTrike tricycle e-hailing flow works: a passenger books a ride, a synthetic driver receives an offer, the ride is simulated end to end, and cash payment is recorded as a demo. It is for stakeholder and LGU/TODA discussion. It is not a live system.

**Status:** see [TEST_RESULTS.md](TEST_RESULTS.md) for the current evidence. The app is not marked PRESENTATION_READY until the full positive workflow and the device checks are complete.

## What is real and what is simulated

| Area | Status in the demo |
|---|---|
| Map | Real OpenStreetMap tiles of Angeles City, drawn with Leaflet inside a WebView. Requires internet for tiles. |
| TODA coverage | **SYNTHETIC.** Three illustrative rectangles (TODA A, B, C). Not official boundaries, not LGU-approved, not TODA territories. |
| Routes | **SIMULATED.** A curved path between two points. Not road routing. Distances are straight-line estimates. |
| Drivers, queue, vehicle numbers | **SYNTHETIC.** Mang Ben, Mang Rudy, Mang Joel; body numbers are invented. |
| Booking, offers, timers | Deterministic state machine. No server, no network dispatch. |
| GPS | The device GPS is read only to centre the map. Driver movement is **simulated**; no physical GPS tracking is claimed. |
| Fare | **DEMO ONLY.** `₱20 + ₱13.50 × km`. Not an official Angeles City tariff. |
| Payment | Cash only, recorded as "collected (DEMO, not real money)". GCash and Maya are shown as "not in demo". No gateway is contacted. |
| Accounts | No login. The passenger and driver are fixed synthetic profiles. |
| Persistence | Demo state lives in memory. It survives a mode switch but not an app restart. |

## Architecture (temporary, for this POC)

- Expo SDK 57 / React Native 0.86.3, TypeScript.
- Single shared state: `src/booking/DemoContext.tsx` wraps a pure reducer in `src/booking/bookingMachine.ts`. Both Passenger and Driver screens read the same state, so a booking created in one mode is visible in the other.
- One simulated clock: a 250 ms tick, multiplied by the presenter's speed. Request, search, offer countdown, approach and trip all advance only on this clock, so pause and speed apply to all of them.
- Navigation is state-based in `App.tsx`.

**Temporary deviation from `AGENTS.md`.** `AGENTS.md` asks for Expo Router with routes under `src/app/`. This POC keeps the existing state-based navigation in `App.tsx`, as instructed for this presentation. The deviation is recorded here and should be revisited before any production build.

## Scope limits

- Not a backend, not production software, not a payment system, not a tracking system.
- No official approval, fare, boundary, route or TODA name is implied.
- Android is tested on an emulator only. No physical device has been used.

## Where to look

- Start the demo: [PRESENTATION_RUNBOOK.md](PRESENTATION_RUNBOOK.md)
- Passenger flow: [PASSENGER_WORKFLOW.md](PASSENGER_WORKFLOW.md)
- Driver flow: [DRIVER_WORKFLOW.md](DRIVER_WORKFLOW.md)
- Map, zones and simulated movement: [GPS_GEOFENCING_DEMO.md](GPS_GEOFENCING_DEMO.md)
- Scenarios and expected outcomes: [DEMO_SCENARIOS.md](DEMO_SCENARIOS.md)
- Screenshots: [SCREENSHOT_GALLERY.html](SCREENSHOT_GALLERY.html)
