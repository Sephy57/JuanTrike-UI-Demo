# GPS and Location Modes

## Product behavior

Location is foreground-only and read on demand. `useForegroundLocation` does not start a watch, background task, or upload. The map can use the latest accepted fix to center or select a pickup; a location request performs a new read rather than silently treating the earlier fix as fresh.

The app distinguishes:

- **Current:** a validated one-shot platform fix no older than two minutes.
- **Last known:** a platform-cached fix no older than five minutes, used only if the current read is invalid, rejected, or times out. The UI retains this label.
- **Simulated:** any emulator/non-device fix. It is marked as simulated and is not represented as physical GPS.
- **Unavailable:** permission denied, services disabled, stale/invalid coordinates, timeout, or provider error; the UI retains a specific status.

An accepted fix must contain finite latitude and longitude in WGS84 ranges, a positive finite timestamp, no timestamp more than five seconds in the future, and pass its source-specific age limit. Missing, non-finite, or negative accuracy is stored as `null` rather than displayed as a measurement.

## Permission and privacy

The current flow requests foreground location only when needed. A denial does not trigger a background permission request. The location screen explains failure states and leaves manual map selection available. The location remains local to the app demo; this implementation does not upload a fix or create a backend record.

On Android, the presentation build relies on Expo Location's foreground permission configuration. No native Android or iOS source is manually edited; native configuration is generated from Expo app config.

## Presenter checks

1. Start on the passenger or driver screen and confirm the location action requests a fresh fix.
2. Accept a current fix only when the UI identifies it as current; on the Android emulator confirm it is labeled simulated.
3. Use a permitted, fresh last-known fix only when the live read is unavailable; verify the UI says last-known.
4. Try permission denied and services disabled states; ensure the app gives manual selection as a way to continue the demo.
5. Choose an outside-city emulator coordinate and confirm the app blocks a booking without presenting it as a valid service-area pickup.

## Tests and limits

`__tests__/gpsFix.test.ts` covers coordinate ranges, timestamps, age, future time and accuracy sanitization. `__tests__/useForegroundLocation.test.tsx` covers fresh one-shot reads, denial, disabled services, invalid/rejected current reads with valid cached fallback, and stale data. These automated tests do not prove physical-device GPS accuracy or user-permission prompt wording.
