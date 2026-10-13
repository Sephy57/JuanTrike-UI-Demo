# Passenger workflow

Everything below is simulated. See [JUANTRIKE_POC_OVERVIEW.md](JUANTRIKE_POC_OVERVIEW.md) for what is synthetic.

## Steps

1. **Welcome.** Choose **Passenger Mode**. (`src/screens/WelcomeScreen.tsx`)
2. **Home map.** Angeles City map. The header reads "Demo passenger: Juan dela Cruz". Tap **Driver Mode** in the header to switch perspectives at any time.
3. **Pickup.** Tap the map. Pickup is set and the coverage line under it reads either *Inside synthetic coverage: SYNTHETIC TODA A* or *Outside demo coverage — not bookable*. "Use my location" centres the map on a GPS fix if one exists.
4. **Destination.** Tap the map again. The destination coverage line is shown the same way.
5. **Review.** Shows the straight-line distance estimate, the **DEMO** fare, the note that the fare is not an official tariff, and the route label *SIMULATED route — not road routing*. Payment shows **Cash** as selected; **GCash** and **Maya** are disabled with "Not in demo".
6. **Confirm.** The Confirm button is disabled if either point is outside synthetic coverage, with a restricted-area warning. When both points are inside, confirming locks the map ("Booking in progress — map locked") and starts the request.
7. **Searching.** "Searching for driver…" with *Offer n of 3* and a countdown when an offer is out. After a decline or expiry the card explains what happened ("The previous driver declined…" / "did not respond in time…").
8. **Driver assigned.** Shows driver name, TODA, body number, simulated ETA and remaining distance, and an approach progress bar.
9. **Driver approaching.** The vehicle marker moves along the simulated route toward pickup.
10. **Trip started.** The vehicle moves along the simulated route from pickup to destination; remaining distance and trip progress are shown.
11. **Trip completed.** Shows the DEMO fare and **Cash collected (DEMO, not real money)**.
12. **History.** The header menu (≡) lists completed and cancelled trips, with the driver and payment status for each.
13. **New booking** returns to the home map with locations cleared.

## Cancellation

- **Cancel booking** is available from the searching, offer, and driver-assigned states. It ends the booking as cancelled with the reason "You cancelled this booking."
- If no driver accepts, the card shows "No eligible driver accepted this booking (DEMO)."

## Rules the passenger can see

- Pickup and destination must both be inside a synthetic TODA zone to book.
- A booking is offered to at most three drivers, in queue order, and only drivers whose TODA covers the pickup.
