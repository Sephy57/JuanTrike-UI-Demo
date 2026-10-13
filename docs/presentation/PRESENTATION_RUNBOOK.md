# Presentation runbook

For the presenter. Everything runs locally; no backend, database, Docker or payment account is needed.

## 1. Before the meeting (on the presenting machine)

1. Close heavy programs (games, extra browser windows, Task Manager). The Android emulator needs free CPU and RAM. In testing, a background game and several browser windows caused input freezes.
2. Confirm checks pass:
   ```powershell
   cd D:\JUANTRIKE-UI-DEMO
   npx tsc --noEmit
   npx eslint src __tests__ App.tsx
   npx jest
   ```
3. Start the Android emulator (`JuanTrike_API36_X86_64`) and wait for boot. Settings are in the AVD `config.ini`; the previous file was backed up to `D:\juantrike-build-logs\config.ini.bak`.
4. Install the debug build if not already installed:
   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   adb reverse tcp:8081 tcp:8081
   ```
   If the APK is missing, build it with `cd android; .\gradlew.bat assembleDebug`. If the Gradle CMake step fails with a "restricted method" warning, set `JAVA_TOOL_OPTIONS=--enable-native-access=ALL-UNNAMED` for the build.
5. Start the dev server with a cleared cache:
   ```powershell
   $env:CI=1; npx expo start --dev-client --port 8081 --clear
   ```
6. On the emulator, clear the app's data once so it loads the current bundle (`adb shell pm clear com.juantrike.uidemo`), then launch JuanTrike.

## 2. Running the demo

1. **Welcome** → **Passenger Mode**.
2. Tap the map near the centre to set the pickup (green), then tap again to set the destination (amber). Both should read *Inside synthetic coverage: SYNTHETIC TODA A*.
3. Tap **Confirm DEMO booking**. The map locks and the search starts.
4. Open the demo panel (orange button, lower right of the map) to use presenter controls:
   - **Pause simulation** before accepting, so the offer countdown holds.
   - **Speed** cycles 1x → 2x → 4x for faster presentation.
   - **Simulate driver decline** / **Simulate offer expiry** show escalation.
   - **Simulate out-of-coverage booking** shows the restricted-area rule.
   - **Reset** returns to the start.
5. Switch to **Driver Mode** (header button). Accept the incoming offer, then resume the simulation.
6. Return to Passenger Mode to show the assignment, the approach, the trip, and the completed cash payment.
7. Show history (≡ menu on the passenger side), then tap **Return to queue** / **New booking**.

## 3. Things to say to stakeholders

- Every zone, driver, route, fare and payment is synthetic and labelled as such.
- The map tiles are real OpenStreetMap data; the zones are not official boundaries.
- Driver movement is simulated; the demo does not track real vehicles.

## 4. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "JuanTrike isn't responding" dialog | Host overloaded, or map tiles loading slowly | Tap **Wait**; close heavy host programs |
| Map shows no zones | Stale JavaScript bundle on the device | `pm clear` the app, relaunch |
| Welcome screen does not change on tap | Input lag from the emulator | Wait a few seconds and tap again |
| Offer expires before accepting | Countdown running | Use the panel's **Pause simulation** first |
| Map blank with "Map tiles unavailable" | No internet | Zones still show; the demo works offline except for tiles |

## 5. Reset between presentations

Use **Reset** in the demo panel, or relaunch the app. Demo state is in memory, so an app restart also clears it.

## 6. Known device issues from the final acceptance run

- **First tap after launch is often lost.** Tap Passenger Mode twice, then check the screen.
- **Mode switches and panel taps can be delayed.** The header "Driver Mode"/"Passenger Mode" buttons and the orange demo button sometimes do not register on the first tap, and a late tap can switch the mode a second time. Take a screenshot after each step and repeat a tap only if the screen did not change.
- **Offers expire if the presenter is slow.** Pause the simulation from the demo panel before the offer appears, then resume and accept. The first run in this session let two offers expire, which correctly ended the booking with "No eligible driver accepted".
- **Stale bundle after code changes.** Restart Metro with `--clear` after edits. The Hermes bytecode variant can keep an old copy; if the panel or map looks out of date, clear app data (`adb shell pm clear com.juantrike.uidemo`) and relaunch.
- **Speed carries over.** The speed control persists across the session. Set it back to 1x before a full run; 2x or 4x shortens the offer window.
- (Superseded by section 7.) The passenger trip history and the full repeat run were not yet verified on the device at the time this was written. See TEST_RESULTS.md section 12.


## 7. Presenting the final standalone build (current)

This is the current runbook. Earlier sections describe the dev-build workflow and stay for the record. The bullet above that says the passenger history and repeat run are "not yet verified" is superseded by this section, which verifies both on the release APK (TEST_RESULTS.md section 12).

### 7.1 What you need

- The APK: `dist/presentation/JuanTrike-x86_64-release.apk` (27.75 MB, x86_64 only). SHA-256: `4bc3d3c3fef0219c316c62098a6af4272a5f570aadb15f7610435f99dd4fe37f`.
- An x86_64 Android emulator (`JuanTrike_API36_X86_64`, Android 36). arm64 phones cannot run this build.
- Enough free RAM. The emulator alone uses about 3 GB. Close browser tabs and large apps first. Keep at least 3 GB free on the host.
- Enough free disk space on C:. Gradle's home is on D:, but the device logs are not.

### 7.2 Install and start (no Metro needed)

1. Start the emulator: `emulator -avd JuanTrike_API36_X86_64 -no-snapshot-load`. Wait for `adb shell getprop sys.boot_completed` to print `1`.
2. Install: `adb install -r dist/presentation/JuanTrike-x86_64-release.apk`. Expect `Success`.
3. Launch: `adb shell monkey -p com.juantrike.uidemo -c android.intent.category.LAUNCHER 1`. Metro is not needed, and `adb reverse` is not needed.
4. If the system shows "System UI isn't responding" right after boot, tap **Wait** once. Do not force-close it while the emulator is still settling.

### 7.3 Demo sequence (about 2 minutes)

1. **Passenger Mode** on the Welcome screen.
2. Open **Demo controls** (gear icon) and tap **Restore demo locations**. This puts pickup and destination inside SYNTHETIC TODA A. The map opens over Manila, outside the synthetic zones, so this is the reliable way to set the route.
3. Tap **Confirm DEMO booking**. The map locks with "Booking in progress — map locked".
4. Tap **Driver Mode** (header). The offer card appears at the top with a countdown, Decline and Accept, and the DEMO fare.
5. Tap **Accept**, then **Start toward pickup**, **Arrived at pickup**, **Start trip**. The trip completes automatically.
6. Driver **Trip history**: one completed entry, Mang Ben, 1.42 km, DEMO fare ₱39.
7. **Return to queue**, then **Passenger Mode**, and open passenger **Trip history**: the same single entry.

### 7.4 Scenarios to show (optional)

- **Decline:** repeat steps 1–3, then **Decline** on the first offer. The next driver (Mang Joel) is offered.
- **Three offers, all expire:** let each 20-second offer lapse. Mang Ben, then Mang Joel, then Mang Ernie are offered; then the booking ends as "Trip cancelled". The passenger screen then reads "Booking ended — tap New booking to continue".
- **Outside coverage:** in Demo controls, tap **Simulate out-of-coverage booking**, then scroll the passenger sheet. The destination is refused and Confirm is disabled.
- **Reset during a booking:** start a booking, then Demo controls → **Reset demo**. The map returns to "Tap the map to set pickup" and no offer appears later.
- **Offline map:** turn Wi-Fi and mobile data off, clear the app data, and relaunch. The map shows the synthetic zones as a drawing with the error "Map tiles could not be loaded". Restore the network and relaunch: live tiles return. Say this is a fallback drawing, not an offline map.

### 7.5 Slow emulator: what to do

- **Wait for each screen before tapping.** A tap sent during a 5–10 second stall can be lost or delayed. Watch for the expected text first.
- **Offers last 20 seconds.** Switch to Driver Mode right after confirming, or use Demo controls → **Pause simulation** before the switch, then **Resume simulation** once the offer is on screen. Resume is needed: the search and offer are only generated while the simulation runs.
- **Speed.** Demo controls cycles 1x, 2x, 4x. Set it back to 1x before a full run.
- **If the system dialog appears, tap Wait.** Stop the Gradle and Kotlin daemons after any build, since they hold about 4 GB.
- **If the app freezes,** force-stop it (`adb shell am force-stop com.juantrike.uidemo`) and relaunch. Do not reinstall during a demo.

### 7.6 Things to say to stakeholders

- All GPS, drivers, TODA zones, fares and payment are simulated. Cash is "DEMO collected", not real money.
- The map shows real OpenStreetMap tiles only when online. Offline, the app shows the zones as a drawing and says so.
- The driver offers rotate through a fixed FIFO queue of synthetic drivers. Three offers at most, then the booking ends.
- This is a standalone proof of concept on the device. It has no backend, no login, no payment and no GPS upload.

### 7.7 Known limits (say these if asked)

- The APK is for the x86_64 emulator only, and it is signed with a template debug key. It is not a production build.
- The setup uses **Restore demo locations**, not a live GPS fix or a map tap.
- The offline fallback is a drawing. It does not show a map offline.
- "Trigger example booking" clears trip history. Do not use it mid-demo if history matters.
