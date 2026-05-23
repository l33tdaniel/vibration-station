# Vibration Station Restyle + Profiles + Timer Design

**Goal:** Redesign the single-file PWA with bigger touch targets for caregivers, add a profiles system (frequency + duration stored in localStorage), auto-shutoff timer with live countdown, and improve slider controls.

**Architecture:** Layered single-page UI: Control Center (global + devices), Profiles Bank (idle list or active countdown), Active Session (big timer display). Data: AppStore (existing) + new ProfileStore (localStorage). Timer state is ephemeral (no persistence across page reload).

**Tech Stack:** Vanilla JavaScript, single HTML file, inline CSS, localStorage, no dependencies.

---

## UI Layout & Styling

### Page Structure
1. **Header:** "Vibration Station" + build stamp
2. **Control Center:** Global power/frequency controls + device cards (restyle for accessibility)
3. **Profiles Section:** Idle view (profile list) or Running view (countdown)
4. **Footer:** Build version stamp

### Accessibility & Touch Targets
- Minimum touch target: 44px (buttons, toggles, slider height)
- Font sizes: labels 1.25rem+, countdown 2.5rem (monospace)
- Buttons: Remove, Edit, Delete, Start, Stop all 44px+ height
- Checkboxes: increase from 1.7rem to 2rem (32px)
- Sliders: increase height to 44px, show numeric value (e.g., "120 Hz") next to control
- Responsive: single-column layout on mobile, stacks naturally

### Visual Updates
- Global bar and device cards: increase padding, clearer visual hierarchy
- Frequency slider: optional gradient background or tick marks (80-160 Hz range), larger label text
- Profile cards: clear action buttons (Start, Edit, Delete), readable layout
- Countdown display: large monospace font, centered, with Stop button below
- All inputs and buttons clearly labeled, adequate spacing

---

## Profiles Data & Logic

### Data Model
Profile object stored in localStorage as JSON:
```json
{
  "id": "timestamp-or-uuid",
  "name": "Focus session",
  "frequency": 120,
  "duration": 30
}
```

localStorage key: `"vibration-profiles"` (array of profiles). Profiles persist across page reloads; timer state does not.

### CRUD Operations
- **Load:** On page load, read `vibration-profiles` from localStorage, populate UI.
- **Create:** "New Profile" form (name, frequency 80-160, duration 1-60). Validate inputs. Generate id (timestamp). Append to array, write localStorage, re-render.
- **Edit:** Click "Edit" on profile. Form pre-fills. User changes values. Validate. Update array, write localStorage, re-render.
- **Delete:** Click "Delete" on profile. Confirm. Remove from array, write localStorage, re-render.
- **Start:** Click "Start" on profile. Show device picker modal (checkboxes for each connected device). User selects devices. Timer begins. Apply profile settings to selected devices.

---

## Timer & Auto-Shutoff

### State Machine
- **Idle:** No profile running. Show profile list (or empty message if no profiles exist).
- **Running:** Profile active. Timer counting down (secondsLeft).
- **Stopped:** Timer hit 0 or user clicked Stop. Return to Idle, clear selected devices.

### Timer Execution
1. User clicks "Start" on a profile.
2. Device picker modal shows. User selects devices (at least one required).
3. Timer begins:
   - State: `{ isRunning: true, secondsLeft: duration * 60, deviceIds: [...], profileId }`
   - Timer loop: every 100ms, decrement secondsLeft, update UI (mm:ss format).
   - Power on selected devices with profile frequency.
4. Countdown Display:
   - Large monospace time (mm:ss), e.g., "05:30"
   - Show selected device names ("Running on: Device A, Device B")
   - Big Stop button
   - Manual controls (global power/frequency) still accessible, can override profile
5. At secondsLeft = 0 or user clicks Stop:
   - Power off selected devices.
   - Clear timer state.
   - Return to Idle view (profile list).
6. Special Cases:
   - Page close or BLE disconnect: timer stops, firmware safety-stops motor on disconnect (no action needed in JS).
   - Device disconnect during profile: remove from active list, show "Device X disconnected", continue timer with remaining devices.
   - Manual power override: if user toggles global power off, motor stops but timer keeps running. User can toggle power back on to resume.

---

## Slider & Control Improvements

### Touch Targets
- Frequency slider: 44px height (from ~35px), full-width inside label container, larger numeric display ("120 Hz").
- Power toggles: 2rem (32px) checkboxes (from 1.7rem).
- All buttons: 44px+ min height, clear text labels.
- Labels: 1.3rem+ font.

### Visual Feedback
- Slider: consider gradient background or subtle tick marks to show 80-160 Hz range.
- Numeric value: display current slider value next to input (e.g., "Frequency: 120 Hz").
- Buttons: hover/active states for tactile feedback.

---

## Error Handling

- **Profile validation:** Duration must be 1-60, frequency 80-160. Show inline error if invalid. Disable Save button until valid.
- **No devices:** If no devices connected when starting a profile, show message and disable Start button.
- **Device disconnect during profile:** Remove from active list, show brief "Device X disconnected" notification, continue timer.
- **localStorage quota:** Unlikely for small profiles, but if exceeded, show warning and don't save.

---

## Testing Approach (Manual)

- **Profile CRUD:** Create profile, verify it appears in list and in localStorage. Edit name/values. Delete. Verify localStorage updates.
- **Timer:** Start 1-minute profile. Watch countdown. Verify motor powers on. Verify countdown reaches 0 and motor powers off automatically.
- **Device picker:** Start profile, toggle device checkboxes, verify only selected devices receive commands.
- **Manual override:** Start profile, toggle global power off during countdown. Verify motor stops. Toggle back on. Verify timer still running.
- **Reconnect:** Start profile, simulate BLE disconnect (close nRF Connect or pull BLE out of range), reconnect. Verify timer keeps running, device re-accepts commands.
- **Profile persistence:** Create profile, reload page. Verify profile still exists. Start it. Reload during timer. Verify timer doesn't persist (expected behavior).

---

## Data Persistence

- **Profiles:** localStorage `vibration-profiles` (JSON array). Persists across reloads.
- **Timer state:** Ephemeral (memory only). If page reloads, timer is lost (user starts a new profile). Intentional design — avoids edge cases with stale timers.
- **Device pairings:** Already persisted by existing DeviceStore (BLE device.id mapping).

---

## No Breaking Changes

- Global power/frequency controls remain and work as before.
- Per-device custom mode remains.
- Manual controls are always accessible (not hidden by profile UI).
- Existing BLE contract (180F/2A19) unchanged.
- Firmware unchanged (profiles are app-only, no new characteristics needed).

---

## Out of Scope (Deferred)

- Battery display (needs firmware reflash for new characteristic).
- Firmware analogWrite + PWM mapping (needs reflash; separate task).
- Profile templates or presets.
- Profile scheduling or recurrence.
- Cloud sync or export.
