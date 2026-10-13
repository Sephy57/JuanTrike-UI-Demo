# JuanTrike UI Demo — 5-Minute Script

Setup: emulator running, Expo Go open at `exp://10.0.2.2:8081`, app on the welcome screen. Demo location is the emulator's GPS fix (labelled emulator-simulated).

| Time | Say | Do |
|---|---|---|
| 0:00 | "This is JuanTrike, a prototype ride-hailing app. The DEMO badge means nothing here is a live service." | Show the welcome screen. Point out the DEMO MODE strip. |
| 0:30 | "Language is switchable. Here is the Filipino version." | Open the ⚙ demo panel, toggle FIL, close it. |
| 0:50 | "Passengers choose their mode here. No login." | Tap Passenger Mode (or switch back to EN first). |
| 1:10 | "The map is real OpenStreetMap, loaded with no API key. Pan and zoom work." | Pan and pinch/zoom the map. |
| 1:40 | "I can use my device location. It asks for permission and shows the accuracy." | Tap Use my location, allow the prompts. Point at the labelled marker. |
| 2:10 | "Or I tap the map to choose the pickup and destination." | Tap two points on the map. |
| 2:30 | "The fare is a synthetic DEMO number, not an official fare." | Scroll to Review booking. Read the distance and DEMO fare. Tap Confirm DEMO booking. |
| 2:45 | "The app searches, then the driver is offered the trip. This is simulated." | Wait for the searching card, then the offer. |
| 3:00 | "Now I switch to the driver's side. Both modes share the same booking." | Tap Driver Mode. Show the incoming DEMO booking. Tap Accept. |
| 3:20 | "The driver advances the trip through each stage." | Tap Start toward pickup, Arrived, Start trip. |
| 3:45 | "Completing the trip writes it to the local history." | Tap Complete trip. Switch to Passenger Mode. Show Trip completed. |
| 4:05 | "Trip history is local to this device." | Open ≡ history, show the record. Close it. |
| 4:20 | "Everything here is simulated except the map, GPS, and UI. No real booking or payment happens." | Open the demo panel to show reset and example controls. Reset demo if needed. |
| 4:45 | Q&A. | |

Fallback: if the map does not load, check the internet connection on the emulator. The app shows a map error message in that case.
