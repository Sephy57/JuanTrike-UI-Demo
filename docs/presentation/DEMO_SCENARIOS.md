# Demo scenarios and expected outcomes

Each scenario lists its trigger, the expected terminal state, and whether it is covered by automated tests (`__tests__/demoContext.test.tsx`, `__tests__/dispatch.test.ts`, `__tests__/bookingMachine.test.ts`) and/or confirmed on the Android emulator.

| # | Scenario | Trigger | Expected result | Automated | Device |
|---|---|---|---|---|---|
| 1 | Positive booking, accept, complete | Pickup and destination in zone A, offer accepted, trip finished | `TRIP_COMPLETED`, cash collected (DEMO), history updated | Yes (accept, approach, trip, payment) | Partial — see TEST_RESULTS |
| 2 | Passenger books outside coverage | Destination at the outside point | Confirm disabled; restricted-area warning; no booking | Yes | Not reached on device |
| 3 | Driver declines | *Decline* or panel *Simulate driver decline* | Next eligible driver offered after search phase | Yes | Not reached on device |
| 4 | Offer expires | Countdown reaches 0 or panel *Simulate offer expiry* | `lastOfferOutcome = EXPIRED`; next driver offered | Yes | Passenger view shown on device (offer 2 of 3) |
| 5 | Three unsuccessful attempts | Two declines/expiries with no third eligible driver | `TRIP_CANCELLED`, reason no-driver | Yes | Shown on device ("Trip cancelled") |
| 6 | No eligible driver | Pickup in zone C | Cancelled after the search phase | Yes | Not reached on device |
| 7 | Booking cancelled by passenger | *Cancel booking* during search/offer/approach | `TRIP_CANCELLED`, reason passenger; movement stops | Yes | Not reached on device |
| 8 | GPS simulation paused | Panel *Pause simulation* during offer or approach | Countdown and movement hold; resume continues from the same point | Yes | Not reached on device |
| 9 | Reset during active booking | Panel *Reset* while offered or approaching | `IDLE`, no timers running | Yes | Not reached on device |
| 10 | Reset after completed trip | *Return to queue* / *New booking* after completion | `IDLE`, history kept | Yes | Not reached on device |
| 11 | Offline or missing map tiles | No internet, or tiles fail | Banner "Map tiles unavailable" and zones still drawn; if Leaflet cannot load, an SVG fallback draws the zones | Not automated | Not tested |
| 12 | Speed change | Panel *Speed* 1x → 2x → 4x | Clock runs faster for every timed step | Yes | Not reached on device |

## Presenter shortcuts

The panel's *Trigger example booking* sets the standard pickup and destination and starts a booking immediately. *Restore demo locations* only resets the points. Neither changes the rules above; both go through the same reducer as normal use.
