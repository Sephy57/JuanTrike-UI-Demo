# JuanTrike UI Demo — Presentation Guide

## What this is
A standalone Expo (React Native) prototype of a ride-hailing app with passenger and driver modes. It runs on one device or emulator, with no backend. Booking, driver responses, trip progress, and history are simulated on the device. The map and GPS are real device capabilities.

## Run it
1. `cd D:\JUANTRIKE-UI-DEMO`
2. Start the emulator `JuanTrike_API36_X86_64`.
3. `npx expo start --port 8081`
4. On the emulator, open Expo Go and enter `exp://10.0.2.2:8081`.

## What is REAL
- The app UI and navigation between the welcome screen, passenger mode, driver mode, and history.
- Interactive OpenStreetMap map (Leaflet in a WebView): pan, zoom, and tap to select points. Attribution is shown.
- Device foreground GPS. It asks for permission, reads one fix, and shows the marker and accuracy. No background tracking. Nothing is uploaded.

## What is SIMULATED (on the device only)
- Driver availability (online/offline toggle) and the driver's response (accept/decline).
- Booking dispatch and the search timing (about 3 seconds).
- Fare estimate: `₱20 + ₱13.50 × km`. It is a synthetic DEMO number and not a TODA or official fare.
- Trip progression (en route, arrived, started, completed).
- Trip history records.

## What is UNAVAILABLE
- A real booking backend or dispatch.
- Payment processing.
- Real TODA operations or drivers.
- Driver-to-passenger communication.

## Things to say
- "Every booking is a local state machine. Passenger and driver read the same state, so there is one booking history."
- "The GPS marker is labelled. On the emulator it says emulator-simulated, and on a phone it says device GPS."
- "The map uses OpenStreetMap tiles, so there is no provider key to set up."

## Known limits to mention honestly
- The official logo is not included yet. Plain-text wordmark is used.
- The native Android build does not compile on this machine. Expo Go is the run path.
- Maestro UI automation is blocked until Drive C has free space.
