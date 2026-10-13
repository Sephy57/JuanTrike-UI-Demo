# Driver workflow

Everything below is synthetic. The driver profile is "Mang Ben (synthetic profile)".

## Steps

1. **Dashboard.** Choose **Driver Mode** from the passenger header or the welcome screen. The dashboard shows the map, the online toggle (*Online (DEMO)*, a single device-level switch), and the **Synthetic FIFO queue**.
2. **Queue.** Lists the synthetic drivers in first-in-first-out order with their TODA and body number. For the current pickup each row says whether that driver is eligible ("Eligible for this pickup") or not ("Outside this pickup's TODA").
3. **Incoming offer.** When a booking is offered, the card appears with:
   - *Offered to* the current driver's name,
   - a countdown (*Expires in n s*),
   - pickup, destination, straight-line distance, the DEMO fare and the note that it is not an official fare,
   - **Decline** and **Accept**.
4. **Accept.** The booking is assigned to the offered driver. The passenger side shows "Driver assigned".
5. **On the way.** The driver taps *On the way* to start the approach. The vehicle moves from its synthetic starting position toward pickup, with ETA and remaining distance.
6. **Arrived.** When the approach completes (or the driver taps *Arrived at pickup*), the driver taps *Start trip*.
7. **Trip.** The vehicle moves along the route to the destination. The trip completes when the progress reaches the end (or the driver taps *Complete trip*).
8. **Completed.** Shows the DEMO fare and "Cash collected (DEMO)". The driver taps **Return to queue**, which clears the active booking and returns the dashboard to its idle state.

## Decline and expiry

- **Decline** removes this driver for the current booking; the next eligible driver in the queue is offered after the search phase.
- **Expiry** works the same way when the countdown reaches zero without a response.
- After three offers, or when no eligible driver remains, the booking is cancelled with "No eligible driver accepted this booking (DEMO)."

## Shared state

Driver and passenger screens read the same reducer state. A driver accept is seen as "Driver assigned" in Passenger Mode, and a completed trip appears in both histories.
