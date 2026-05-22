# Vibration Station Restyle + Profiles + Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement visual restyle, localStorage profiles system (frequency + duration), auto-shutoff timer with live countdown, and bigger slider/button controls in the single-file PWA.

**Architecture:** Add ProfileStore class for localStorage persistence, add profile CRUD functions, add profile form and device picker modals, implement timer loop with 100ms tick, add profile list and countdown views. All changes in single `index.html` file.

**Tech Stack:** Vanilla JavaScript, single HTML file, inline CSS, localStorage.

---

### Task 1: Restyle CSS for Accessibility & Touch Targets

**Files:**
- Modify: `index.html` (CSS section, lines 7-20)

- [ ] **Step 1: Increase button height and padding**

Replace the button CSS:
```css
button { font-size: 1.25rem; padding: .8rem 1.25rem; border-radius: .6rem; border: 1px solid #888; background: #f4f4f5; cursor: pointer; }
```

With:
```css
button { font-size: 1.25rem; padding: 1rem 1.5rem; border-radius: .6rem; border: 1px solid #888; background: #f4f4f5; cursor: pointer; min-height: 44px; display: flex; align-items: center; justify-content: center; }
button:disabled { opacity: .5; cursor: default; }
```

- [ ] **Step 2: Increase checkbox size**

Replace the checkbox CSS:
```css
input[type="checkbox"] { width: 1.7rem; height: 1.7rem; }
```

With:
```css
input[type="checkbox"] { width: 2rem; height: 2rem; }
```

- [ ] **Step 3: Increase slider height and label sizing**

Replace the range and label CSS:
```css
label { display: flex; align-items: center; gap: .75rem; font-size: 1.2rem; margin: .9rem 0; }
input[type="range"] { flex: 1; height: 2.2rem; }
```

With:
```css
label { display: flex; align-items: center; gap: .75rem; font-size: 1.3rem; margin: 1rem 0; }
input[type="range"] { flex: 1; height: 44px; }
```

- [ ] **Step 4: Update global bar and card padding**

Replace:
```css
.global-bar, .cards article { border: 1px solid #ccc; border-radius: .8rem; padding: 1rem 1.2rem; margin: 1rem 0; }
```

With:
```css
.global-bar, .cards article { border: 1px solid #ccc; border-radius: .8rem; padding: 1.5rem; margin: 1rem 0; }
.cards article header { font-weight: 600; font-size: 1.25rem; margin-bottom: .5rem; }
```

- [ ] **Step 5: Add CSS for profiles section and timer display**

Add new CSS rules before the closing `</style>` tag:
```css
.profiles-section { margin: 1rem 0; }
.profile-card { border: 1px solid #ccc; border-radius: .8rem; padding: 1.5rem; margin: 1rem 0; display: flex; justify-content: space-between; align-items: center; }
.profile-info { flex: 1; }
.profile-name { font-weight: 600; font-size: 1.25rem; }
.profile-meta { font-size: 1rem; color: #666; margin-top: .5rem; }
.profile-actions { display: flex; gap: .5rem; }
.profile-actions button { padding: .6rem 1rem; font-size: 1rem; min-height: auto; }
.timer-display { text-align: center; padding: 2rem 1.5rem; }
.timer-countdown { font-size: 2.5rem; font-family: monospace; font-weight: bold; margin: 1rem 0; }
.timer-devices { font-size: 1rem; color: #666; margin: 1rem 0; }
.timer-stop { min-height: 50px; font-size: 1.5rem; background: #ff6b6b; color: white; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 1rem; padding: 2rem; max-width: 90%; max-height: 90vh; overflow-y: auto; }
.modal-header { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
.device-picker { display: flex; flex-direction: column; gap: 1rem; }
.device-picker label { margin: .5rem 0; }
.form-field { display: flex; flex-direction: column; gap: .5rem; margin: 1rem 0; }
.form-field label { font-size: 1.2rem; font-weight: 500; }
.form-field input[type="text"], .form-field input[type="number"] { padding: .75rem; font-size: 1.1rem; border: 1px solid #ccc; border-radius: .5rem; }
.form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.form-actions button { flex: 1; }
.error-message { color: #b00020; font-size: 1rem; margin-top: .25rem; }
```

- [ ] **Step 6: Commit CSS changes**

```bash
git add index.html
git commit -m "style: increase touch targets and font sizes for accessibility"
```

---

### Task 2: Create ProfileStore Class

**Files:**
- Modify: `index.html` (add ProfileStore class before AppStore, around line 51)

- [ ] **Step 1: Add ProfileStore class definition**

Insert after the `// ===== State =====` comment (line 51), before `const DEFAULT_GLOBAL`:

```javascript
// ===== ProfileStore (localStorage) =====
class ProfileStore {
  constructor() {
    this.profiles = [];
    this.load();
  }
  load() {
    try {
      const data = localStorage.getItem("vibration-profiles");
      this.profiles = data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load profiles:", e);
      this.profiles = [];
    }
  }
  save() {
    try {
      localStorage.setItem("vibration-profiles", JSON.stringify(this.profiles));
    } catch (e) {
      console.error("Failed to save profiles:", e);
      return false;
    }
    return true;
  }
  create(name, frequency, duration) {
    if (!name || frequency < 80 || frequency > 160 || duration < 1 || duration > 60) {
      return null;
    }
    const profile = {
      id: String(Date.now()),
      name,
      frequency: Math.round(frequency),
      duration: Math.round(duration),
    };
    this.profiles.push(profile);
    this.save();
    return profile;
  }
  update(id, name, frequency, duration) {
    const p = this.profiles.find((x) => x.id === id);
    if (!p) return null;
    if (!name || frequency < 80 || frequency > 160 || duration < 1 || duration > 60) {
      return null;
    }
    p.name = name;
    p.frequency = Math.round(frequency);
    p.duration = Math.round(duration);
    this.save();
    return p;
  }
  delete(id) {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.save();
  }
  get(id) {
    return this.profiles.find((p) => p.id === id);
  }
  getAll() {
    return [...this.profiles];
  }
}
```

- [ ] **Step 2: Test ProfileStore manually**

Open browser console and run:
```javascript
const ps = new ProfileStore();
ps.create("Test 1", 120, 5);
ps.create("Test 2", 100, 10);
console.log(ps.getAll());
```

Expected: Array with two profile objects, with id, name, frequency, duration fields.

Check localStorage:
```javascript
JSON.parse(localStorage.getItem("vibration-profiles"))
```

Expected: Same two profiles persisted.

- [ ] **Step 3: Commit ProfileStore class**

```bash
git add index.html
git commit -m "feat: add ProfileStore for localStorage persistence"
```

---

### Task 3: Add Profile Form Component

**Files:**
- Modify: `index.html` (add form function before renderConnectView, around line 164)

- [ ] **Step 1: Add createProfileForm function**

Insert before `// ===== Connect view =====` (line 164):

```javascript
// ===== Profile Form =====
function createProfileForm(initialData = null, onSave, onCancel) {
  const isEdit = !!initialData;
  const form = h("div", { class: "form-group" }, [
    h("div", { class: "form-field" }, [
      h("label", {}, ["Profile Name"]),
      h("input", {
        type: "text",
        value: initialData?.name || "",
        "data-field": "name",
        "data-role": "profile-name",
        onInput: (e) => validateForm(),
      }),
    ]),
    h("div", { class: "form-field" }, [
      h("label", {}, ["Frequency (Hz)"]),
      h("input", {
        type: "number",
        min: "80",
        max: "160",
        value: initialData?.frequency || "120",
        "data-field": "frequency",
        "data-role": "profile-frequency",
        onInput: (e) => validateForm(),
      }),
    ]),
    h("div", { class: "form-field" }, [
      h("label", {}, ["Duration (minutes)"]),
      h("input", {
        type: "number",
        min: "1",
        max: "60",
        value: initialData?.duration || "5",
        "data-field": "duration",
        "data-role": "profile-duration",
        onInput: (e) => validateForm(),
      }),
    ]),
    h("div", { "data-role": "form-error", class: "error-message" }),
    h("div", { class: "form-actions" }, [
      h("button", {
        "data-action": "save",
        onClick: () => {
          const name = form.querySelector('[data-field="name"]').value;
          const freq = Number(form.querySelector('[data-field="frequency"]').value);
          const dur = Number(form.querySelector('[data-field="duration"]').value);
          if (!name || freq < 80 || freq > 160 || dur < 1 || dur > 60) {
            form.querySelector('[data-role="form-error"]').textContent = "Invalid input";
            return;
          }
          onSave({ name, frequency: freq, duration: dur });
        },
      }, [isEdit ? "Update" : "Create"]),
      h("button", { onClick: onCancel }, ["Cancel"]),
    ]),
  ]);
  const validateForm = () => {
    const name = form.querySelector('[data-field="name"]').value;
    const freq = Number(form.querySelector('[data-field="frequency"]').value);
    const dur = Number(form.querySelector('[data-field="duration"]').value);
    const error = form.querySelector('[data-role="form-error"]');
    let msg = "";
    if (!name) msg = "Name required";
    else if (freq < 80 || freq > 160) msg = "Frequency 80–160 Hz";
    else if (dur < 1 || dur > 60) msg = "Duration 1–60 min";
    error.textContent = msg;
  };
  return form;
}
```

- [ ] **Step 2: Test form creation in browser console**

```javascript
const form = createProfileForm(null, (data) => console.log("saved", data), () => console.log("cancel"));
document.body.append(form);
```

Expected: Form appears with three input fields and two buttons. Try filling in invalid values (frequency 70, duration 100) and check that error message appears.

- [ ] **Step 3: Commit form component**

```bash
git add index.html
git commit -m "feat: add profile form component"
```

---

### Task 4: Render Profile List (Idle View)

**Files:**
- Modify: `index.html` (add profile list function before renderConnectView, around line 164)

- [ ] **Step 1: Add renderProfilesSection function**

Insert before `// ===== Connect view =====`:

```javascript
// ===== Profiles View =====
function renderProfilesSection(root, { store, profileStore, ble, onStartProfile, onEditProfile, onDeleteProfile, onCreateProfile }) {
  clear(root);
  const section = h("section", { class: "profiles-section" }, [
    h("h2", {}, ["Profiles"]),
  ]);
  
  const profiles = profileStore.getAll();
  if (profiles.length === 0) {
    section.append(h("p", {}, ["No profiles yet. Create one to get started."]));
  } else {
    for (const p of profiles) {
      const card = h("div", { class: "profile-card", "data-id": p.id }, [
        h("div", { class: "profile-info" }, [
          h("div", { class: "profile-name" }, [p.name]),
          h("div", { class: "profile-meta" }, [`${p.frequency} Hz, ${p.duration} min`]),
        ]),
        h("div", { class: "profile-actions" }, [
          h("button", {
            "data-action": "start",
            onClick: () => onStartProfile(p.id),
          }, ["Start"]),
          h("button", {
            "data-action": "edit",
            onClick: () => onEditProfile(p.id),
          }, ["Edit"]),
          h("button", {
            "data-action": "delete",
            onClick: () => {
              if (confirm(`Delete profile "${p.name}"?`)) {
                onDeleteProfile(p.id);
              }
            },
          }, ["Delete"]),
        ]),
      ]);
      section.append(card);
    }
  }
  
  const createBtn = h("button", {
    "data-action": "create",
    onClick: onCreateProfile,
  }, ["+ New Profile"]);
  section.append(createBtn);
  
  root.append(section);
}
```

- [ ] **Step 2: Test profile list view manually**

Create test profiles in console:
```javascript
const ps = new ProfileStore();
ps.create("Relax", 100, 10);
ps.create("Focus", 130, 15);
const root = document.createElement("div");
renderProfilesSection(root, { store: null, profileStore: ps, ble: null, onStartProfile: () => {}, onEditProfile: () => {}, onDeleteProfile: () => {}, onCreateProfile: () => {} });
document.body.append(root);
```

Expected: Two profile cards appear with Start, Edit, Delete buttons, plus a "+ New Profile" button.

- [ ] **Step 3: Commit profile list**

```bash
git add index.html
git commit -m "feat: add profile list (idle view)"
```

---

### Task 5: Create Device Picker Modal

**Files:**
- Modify: `index.html` (add modal function before renderProfilesSection)

- [ ] **Step 1: Add createDevicePickerModal function**

Insert before `// ===== Profiles View =====`:

```javascript
// ===== Device Picker Modal =====
function createDevicePickerModal(devices, onConfirm, onCancel) {
  const selected = new Set();
  const modal = h("div", { class: "modal-overlay", "data-role": "device-picker-modal" }, [
    h("div", { class: "modal-content" }, [
      h("div", { class: "modal-header" }, ["Select Devices"]),
      h("div", { class: "device-picker" }, devices.map((d) =>
        h("label", {}, [
          h("input", {
            type: "checkbox",
            checked: false,
            onChange: (e) => {
              if (e.target.checked) selected.add(d.id);
              else selected.delete(d.id);
            },
          }),
          ` ${d.name}`,
        ])
      )),
      h("div", { class: "form-actions" }, [
        h("button", {
          onClick: () => {
            if (selected.size === 0) {
              alert("Select at least one device");
              return;
            }
            onConfirm(Array.from(selected));
            modal.remove();
          },
        }, ["Start"]),
        h("button", {
          onClick: () => {
            onCancel();
            modal.remove();
          },
        }, ["Cancel"]),
      ]),
    ]),
  ]);
  
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      onCancel();
      modal.remove();
    }
  });
  
  return modal;
}
```

- [ ] **Step 2: Test device picker modal manually**

```javascript
const devices = [
  { id: "dev-1", name: "Device A" },
  { id: "dev-2", name: "Device B" },
];
const modal = createDevicePickerModal(devices, (selected) => console.log("selected", selected), () => console.log("cancel"));
document.body.append(modal);
```

Expected: Modal overlay appears with checkboxes for Device A and Device B, Start and Cancel buttons. Clicking Start with no devices selected shows alert. Selecting devices and clicking Start logs the selected device IDs.

- [ ] **Step 3: Commit device picker**

```bash
git add index.html
git commit -m "feat: add device picker modal"
```

---

### Task 6: Implement Timer Loop & State Machine

**Files:**
- Modify: `index.html` (add timer state and loop logic before AppStore, around line 51)

- [ ] **Step 1: Add TimerState and timer loop function**

Insert after ProfileStore class, before AppStore:

```javascript
// ===== Timer =====
class TimerState {
  constructor() {
    this.isRunning = false;
    this.secondsLeft = 0;
    this.deviceIds = [];
    this.profileId = null;
    this.intervalId = null;
  }
  start(profile, deviceIds, onTick, onComplete) {
    this.isRunning = true;
    this.secondsLeft = profile.duration * 60;
    this.deviceIds = deviceIds;
    this.profileId = profile.id;
    this.intervalId = setInterval(() => {
      this.secondsLeft -= 0.1; // 100ms tick
      onTick(this.secondsLeft);
      if (this.secondsLeft <= 0) {
        this.stop();
        onComplete();
      }
    }, 100);
  }
  stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.secondsLeft = 0;
    this.deviceIds = [];
    this.profileId = null;
  }
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}
```

- [ ] **Step 2: Test timer manually in console**

```javascript
const timer = new TimerState();
timer.start(
  { duration: 1, id: "p1" },
  ["d1"],
  (secondsLeft) => console.log("tick", timer.formatTime(secondsLeft)),
  () => console.log("done")
);
// Wait ~5 seconds, watch console log ticks
// After 60 seconds, should log "done"
```

Expected: Logs "tick 00:59", "tick 00:58", etc. every ~1 second (due to 100ms tick granularity). After 60 seconds, logs "done" and timer.isRunning is false.

- [ ] **Step 3: Commit timer loop**

```bash
git add index.html
git commit -m "feat: implement timer loop and state machine"
```

---

### Task 7: Render Countdown Display

**Files:**
- Modify: `index.html` (add countdown view function before renderProfilesSection)

- [ ] **Step 1: Add renderCountdownView function**

Insert before `// ===== Profiles View =====`:

```javascript
// ===== Countdown View =====
function renderCountdownView(root, { timer, deviceNames, onStop }) {
  clear(root);
  const section = h("section", { class: "profiles-section" }, [
    h("h2", {}, ["Active Session"]),
    h("div", { class: "timer-display" }, [
      h("div", { class: "timer-countdown", "data-role": "countdown-display" }, [timer.formatTime(timer.secondsLeft)]),
      h("div", { class: "timer-devices" }, [`Running on: ${deviceNames.join(", ")}`]),
      h("button", {
        class: "timer-stop",
        "data-action": "stop",
        onClick: onStop,
      }, ["Stop"]),
    ]),
  ]);
  root.append(section);
}

// Helper: subscribe to timer updates (called every 100ms)
function subscribeToTimer(timer, onTick) {
  const originalStart = timer.start.bind(timer);
  timer.start = function(profile, deviceIds, onTickCallback, onComplete) {
    return originalStart(profile, deviceIds, (secondsLeft) => {
      onTickCallback(secondsLeft);
      onTick(secondsLeft);
    }, onComplete);
  };
}
```

- [ ] **Step 2: Test countdown view manually**

```javascript
const timer = new TimerState();
const root = document.createElement("div");
renderCountdownView(root, { timer, deviceNames: ["Device A", "Device B"], onStop: () => console.log("stopped") });
document.body.append(root);
timer.start({ duration: 1 }, ["d1", "d2"], () => {}, () => {});
// Watch the countdown display update every 100ms
```

Expected: Countdown display appears with "00:60", device names, and Stop button. As timer ticks, display updates (00:59, 00:58, etc.). Clicking Stop logs "stopped".

- [ ] **Step 3: Commit countdown view**

```bash
git add index.html
git commit -m "feat: add countdown display and active session view"
```

---

### Task 8: Wire Timer into Control Flow

**Files:**
- Modify: `index.html` (update bootstrap to integrate timer with profiles)

- [ ] **Step 1: Update bootstrap to initialize ProfileStore and TimerState**

Find the bootstrap section (around line 256, `const app = document.getElementById("app")`), and add before `const store = new AppStore()`:

```javascript
const profileStore = new ProfileStore();
const timerState = new TimerState();
```

- [ ] **Step 2: Update renderAll function to handle timer state**

Find `const renderAll = () => {` (around line 275) and replace with:

```javascript
const renderAll = () => {
  renderConnectView(connectRoot, { store, ble, onAdded: () => renderAll() });
  
  // Choose view: timer running or profile list
  if (timerState.isRunning) {
    const activeDevices = store.get().devices.filter((d) => timerState.deviceIds.includes(d.id));
    const deviceNames = activeDevices.map((d) => d.name);
    renderCountdownView(controlRoot, {
      timer: timerState,
      deviceNames,
      onStop: () => {
        // Power off all selected devices and stop timer
        for (const id of timerState.deviceIds) {
          ble.setPower(id, false);
        }
        timerState.stop();
        renderAll();
      },
    });
  } else {
    renderControlView(controlRoot, { store, ble });
    renderProfilesSection(controlRoot, {
      store,
      profileStore,
      ble,
      onStartProfile: (profileId) => {
        const profile = profileStore.get(profileId);
        const devices = store.get().devices;
        if (devices.length === 0) {
          alert("No devices connected");
          return;
        }
        const modal = createDevicePickerModal(devices, (selectedIds) => {
          // Power on selected devices with profile settings
          for (const id of selectedIds) {
            ble.setPower(id, true);
            ble.setFrequency(id, profile.frequency);
          }
          // Start timer with UI update callback
          timerState.start(profile, selectedIds, () => {
            // Update countdown display every 100ms
            const display = controlRoot.querySelector('[data-role="countdown-display"]');
            if (display) display.textContent = timerState.formatTime(timerState.secondsLeft);
          }, () => {
            // Timer completed, power off devices
            for (const id of selectedIds) {
              ble.setPower(id, false);
            }
            renderAll();
          });
          renderAll();
        }, () => {});
        document.body.append(modal);
      },
      onEditProfile: (profileId) => {
        const profile = profileStore.get(profileId);
        const form = createProfileForm(profile, (data) => {
          profileStore.update(profileId, data.name, data.frequency, data.duration);
          document.querySelector('[data-role="edit-modal"]').remove();
          renderAll();
        }, () => {
          document.querySelector('[data-role="edit-modal"]').remove();
          renderAll();
        });
        const modal = h("div", { class: "modal-overlay", "data-role": "edit-modal" }, [
          h("div", { class: "modal-content" }, [
            h("div", { class: "modal-header" }, ["Edit Profile"]),
            form,
          ]),
        ]);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) modal.remove();
        });
        document.body.append(modal);
      },
      onDeleteProfile: (profileId) => {
        profileStore.delete(profileId);
        renderAll();
      },
      onCreateProfile: () => {
        const form = createProfileForm(null, (data) => {
          profileStore.create(data.name, data.frequency, data.duration);
          document.querySelector('[data-role="create-modal"]').remove();
          renderAll();
        }, () => {
          document.querySelector('[data-role="create-modal"]').remove();
          renderAll();
        });
        const modal = h("div", { class: "modal-overlay", "data-role": "create-modal" }, [
          h("div", { class: "modal-content" }, [
            h("div", { class: "modal-header" }, ["New Profile"]),
            form,
          ]),
        ]);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) modal.remove();
        });
        document.body.append(modal);
      },
    });
  }
};
```

- [ ] **Step 3: Test integration manually**

1. Open the app at `http://localhost:8000`
2. Create a new profile (name: "Test", frequency: 120, duration: 1)
3. Click "Start" on the profile
4. Device picker modal should appear; select one device
5. Click "Start" again
6. Countdown display should appear with live countdown (should show 00:60 initially, counting down)
7. Verify global power/frequency controls still work (can override during countdown)
8. Let timer count down to 0, or click Stop button
9. Should return to profiles list

- [ ] **Step 4: Commit integration**

```bash
git add index.html
git commit -m "feat: wire timer into profile flow, integrate device picker and countdown display"
```

---

### Task 9: Add Error Handling & Edge Cases

**Files:**
- Modify: `index.html` (add error handling in timer and profile logic)

- [ ] **Step 1: Add error handling for localStorage quota**

In ProfileStore.save() method, update to handle quota exceeded:

Find the save() method in ProfileStore and replace with:

```javascript
save() {
  try {
    localStorage.setItem("vibration-profiles", JSON.stringify(this.profiles));
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      alert("Storage quota exceeded. Cannot save profile.");
      return false;
    }
    console.error("Failed to save profiles:", e);
    return false;
  }
  return true;
}
```

- [ ] **Step 2: Add error handling for device disconnect during timer**

In the timer loop, handle device disconnection. Update renderAll to check for disconnected devices:

Find the part where we render countdown view and update onStop logic to handle missing devices:

```javascript
onStop: () => {
  // Power off devices that are still connected
  const activeDevices = store.get().devices;
  for (const id of timerState.deviceIds) {
    if (activeDevices.find((d) => d.id === id)) {
      ble.setPower(id, false);
    }
  }
  timerState.stop();
  renderAll();
},
```

And when timer completes, update to handle disconnected devices:

```javascript
}, () => {
  // Timer completed, power off connected devices
  const activeDevices = store.get().devices;
  for (const id of selectedIds) {
    if (activeDevices.find((d) => d.id === id)) {
      ble.setPower(id, false);
    }
  }
  renderAll();
});
```

- [ ] **Step 3: Add validation for profile form fields**

The createProfileForm already validates in validateForm() function. Ensure all validation is in place:
- Name: required, non-empty
- Frequency: 80-160
- Duration: 1-60

(Already implemented in Task 3 form validation)

- [ ] **Step 4: Add "no devices" check in device picker**

Ensure device picker only appears if devices are connected. Already implemented in onStartProfile callback:

```javascript
if (devices.length === 0) {
  alert("No devices connected");
  return;
}
```

- [ ] **Step 5: Test error cases**

1. Disconnect a device mid-timer: verify timer continues with remaining devices
2. Try to create a profile with invalid frequency (70 Hz): should show error
3. Try to start a profile with no devices selected: should show alert
4. Try to start a profile with no devices connected: should show alert

- [ ] **Step 6: Commit error handling**

```bash
git add index.html
git commit -m "feat: add error handling for disconnection, validation, quota"
```

---

### Task 10: Manual Testing & Polish

**Files:**
- Test: `index.html` (manual user testing in browser)

- [ ] **Step 1: Set up local server**

```bash
cd /Users/danielneugent/Desktop/Coding/vibration-station
python3 -m http.server 8000
```

Open `http://localhost:8000/?fake` to use fake BLE service (no hardware needed).

- [ ] **Step 2: Test Profile CRUD**

- Create a profile: "Morning Focus", 110 Hz, 5 min. Verify it appears in list. Check localStorage in DevTools.
- Edit the profile: change to "Evening Focus", 100 Hz, 10 min. Verify changes appear. Check localStorage.
- Delete the profile. Verify it disappears from list and localStorage.
- Reload page. Verify profiles persist.

- [ ] **Step 3: Test Timer Flow**

- Create profile "Test Timer", 120 Hz, 1 min
- Click Start
- Device picker appears; select a device
- Click Start again
- Countdown display appears showing 00:60
- Watch countdown tick down (should update every 1 second, visible as mm:ss change)
- Let it count to 0, or click Stop
- Verify timer stops and returns to profiles list

- [ ] **Step 4: Test Manual Override During Timer**

- Start a profile with a device
- During countdown, toggle the global power checkbox
- Verify motor powers off (in console, check `ble.calls` for setPower(id, false))
- Toggle power back on during countdown
- Verify motor powers back on
- Verify timer is still running

- [ ] **Step 5: Test Device Disconnection**

- Connect multiple fake devices (using `?fake` mode, you can manually create them in console)
- Start a profile with 2 devices
- While timer runs, simulate disconnect of one device by removing it from the device list
- Verify timer continues with remaining device(s)

- [ ] **Step 6: Test Touch Targets & Accessibility**

- On mobile or responsive mode (DevTools), check:
  - Buttons are at least 44px high
  - Checkboxes are at least 32px
  - Sliders are at least 44px tall
  - Text is readable at 1.25rem+
  - Profile cards are tappable

- [ ] **Step 7: Commit final testing**

```bash
git add index.html
git commit -m "test: manual testing and polish complete"
```

- [ ] **Step 8: Push to GitHub Pages**

```bash
git push origin main
```

Verify deployed at https://l33tdaniel.github.io/vibration-station/ (or your deployed URL).

- [ ] **Step 9: Final Validation**

- Open deployed URL on mobile (iPhone with Bluefy, Android Chrome)
- Test profile creation, timer, countdown
- Verify localStorage persists profiles
- Test with actual hardware if available

---

## Self-Review

**Spec Coverage:**
- ✅ UI Layout & Styling: Task 1 (CSS restyle, touch targets)
- ✅ Profiles Data & Logic: Tasks 2, 3, 4 (ProfileStore, form, list view)
- ✅ Timer & Auto-Shutoff: Tasks 6, 7, 8 (timer loop, countdown display, integration)
- ✅ Slider & Control Improvements: Task 1 (CSS sizing)
- ✅ Error Handling: Task 9 (validation, disconnection, quota)
- ✅ Testing: Task 10 (manual testing steps)

**Placeholder Scan:**
- No TBD, TODO, or "fill in details" placeholders
- All code blocks are complete and concrete
- All validation logic is specified

**Type Consistency:**
- ProfileStore methods: create, update, delete, get, getAll — consistent naming
- TimerState: start, stop, formatTime — consistent interface
- Modal and form functions: consistent naming (createDevicePickerModal, createProfileForm)
- Data model: profile object has id, name, frequency, duration — consistent across all tasks

**Scope Check:**
- All four features (restyle, profiles, timer, slider) addressed in single implementation
- No extra subsystems; focused on single-file PWA
- Self-contained, produces working feature end-to-end

---

**Plan ready. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
