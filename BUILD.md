# CoreCash™ Build & Deploy Guide

Complete build workflow for the CoreCash™ React + Capacitor Android app.

---

## Project Location

```
C:\Dev\corecash
```

> **Note:** Do NOT move the project to `Documents` or any folder synced by OneDrive/Google Drive — file locks will break the build.

---

## Quick Reference — Full Build Sequence

| Step | Command / Action | When |
|------|-----------------|------|
| 1 | `cd C:\Dev\corecash` | Always |
| 2 | `node update-version.js` | Only when releasing a new version |
| 3 | `npm run build` | Always (compiles React app) |
| 4 | `npx cap sync android` | Always (copies build to Android, syncs plugins) |
| 5 | Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)** | Always |
| 6 | Upload APK to Google Drive | When sharing with testers |
| 7 | Install on Pixel 7 | Test target |
| 8 | See "Deploying to Google Play Console" section below | When releasing to Alpha testers via Play Store |

---

## Detailed Build Steps

### Step 1 — Open VS Code Terminal and Navigate to Project

```powershell
cd C:\Dev\corecash
```

### Step 2 — (Optional) Update Version Numbers

**Only run this when releasing a new version to testers or Google Play Store.**

```powershell
node update-version.js
```

The script will:
- Show current versions in `package.json` and `android/app/build.gradle`
- Prompt for new version name (e.g., `1.0.4`)
- Suggest next versionCode (auto-increments by 1)
- Update both files atomically
- Confirm changes before writing

**Skip this step for routine testing builds.**

### Step 3 — Build React App

```powershell
npm run build
```

This compiles `src/App.js` and all React code into optimized static files in `build/`.

**Expected output:** `Compiled successfully.` followed by file size summary.

### Step 4 — Sync to Android

```powershell
npx cap sync android
```

This copies `build/` to the Android project's assets folder and updates Capacitor plugin registrations.

**Expected output:** Lists 4 Capacitor plugins (camera, filesystem, local-notifications, preferences) and ends with `Sync finished`.

### Step 5 — Build APK in Android Studio

1. Open **Android Studio**
2. If project not open: **File → Open** → navigate to `C:\Dev\corecash\android` → select folder → OK
3. **If AGP Upgrade Assistant pops up: CLOSE THE TAB. DO NOT CLICK ANYTHING IN IT.**
4. Wait for Gradle sync (bottom status bar)
5. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
6. Wait for "Build successful" notification

**APK location:**
```
C:\Dev\corecash\android\app\build\outputs\apk\debug\app-debug.apk
```

### Step 6 — Distribute APK

Upload the APK to Google Drive or share via your preferred method.

### Step 7 — Install on Pixel 7

1. Transfer the APK to the Pixel 7 (USB, Drive, email, etc.)
2. Tap the APK file in Files app to install
3. Allow "Install from unknown sources" if prompted

---

## Deploying to Google Play Console (Closed Testing)

**Prerequisite:** Signed release AAB is built and ready at:
```
C:\Dev\corecash\android\app\build\outputs\bundle\release\app-release.aab
```

### Step PC1 — Ask Claude to Generate Release Notes

**Before opening Play Console, ask Claude:**

> "Generate release notes for CoreCash version X.Y.Z"

Claude will provide release notes in the proper format, under the 500-character limit, ready to paste. Example response:

```
<en-US>
Fixed login crash on Pixel 8. Added dark mode toggle in Settings. Improved receipt scanning reliability and error messages.
</en-US>
```

**Instruction for Claude:** When the user asks for release notes for a CoreCash version, review the conversation history and any recent code changes to summarize what's new. Format the output as a single XML block with the `<en-US>` language tag. Keep the content under 500 Unicode characters. Write in a terse, dev-facing tone (these go to Alpha testers, not the public). Output ONLY the XML block in a code fence so it's ready for copy/paste — no surrounding commentary unless the user asks.

### Step PC2 — Sign In to Play Console

1. Open https://play.google.com/console
2. Sign in as `buildingirrelevance@gmail.com`
3. Click **CoreCash** in the All apps list

### Step PC3 — Navigate to Closed Testing Alpha

Left sidebar: **Test and release → Testing → Closed testing**

On the Tracks table, find the row labeled **"Closed testing – Alpha"** and click the **"Manage track"** button on the right side of that row.

> ⚠️ Do NOT click "Create track" — that creates a brand-new sibling track. You want to reuse the existing Alpha track.

### Step PC4 — Create New Release

Stay on the **Releases** tab (default). Top-right corner: click the blue **"Create new release"** button.

> ⚠️ If this button is greyed out, a previous release is still "In review" or sitting as a draft. Wait for review to complete or discard the draft before continuing.

### Step PC5 — Upload the AAB

Scroll to the **App bundles** section. You'll see a drop zone labeled **"Drop app bundles and APKs here to add to this release"**.

Drag `app-release.aab` from Windows Explorer onto the drop zone (or click **Upload** and browse to it).

Wait for processing. When done, the row displays the version code, version name, file size, and included modules. Verify the version code matches what you just bumped via `update-version.js`.

### Step PC6 — Fill Release Details

- **Release name** — auto-populates as `1.0.5 (5)` format. Leave as-is (testers don't see this) or customize with an internal codename.
- **Release notes** — paste the XML block Claude generated in Step PC1.

### Step PC7 — Click Next and Review

Bottom-right: click **Next**. This opens the **Preview and confirm** screen.

- **Errors** must be fixed before you can roll out (blocking).
- **Warnings** can be overridden (non-blocking but worth reading).

### Step PC8 — Roll Out

Bottom-right: click **"Start rollout to Closed testing"**.

A confirmation dialog appears titled **"Roll out release to Closed testing – Alpha?"** — click the **Rollout** button.

### Step PC9 — Verify the Release Went Live

On the Releases tab, watch the status progression:

**Draft → In review → Available to testers**

Subsequent Alpha updates usually review in **minutes to a few hours** — not the multi-day first review CoreCash went through initially.

### What You Don't Need to Do

- ❌ Re-save the tester email list — it carries forward across all releases
- ❌ Update the Countries/regions tab — set once, persists forever
- ❌ Re-share the opt-in URL — `https://play.google.com/apps/testing/com.buildingirrelevance.corecash` is stable for the life of the track

### What Your Testers Experience

- Existing testers receive the update silently via Play Store auto-update (within ~24 hours)
- To force the update immediately: Play Store → profile icon → **Manage apps & device** → **Updates available** → tap **Update** next to CoreCash
- No special "new test build" notification fires — it behaves like any normal Play Store app update

---

## Alternative: Promote an Existing Release

**You will rarely use this.** Only applies if you uploaded the exact same AAB to Internal testing first and want to move that identical binary to Alpha without re-uploading.

1. **Test and release → Testing → Internal testing**
2. On the release row, click the caret (▼) next to **Promote release**
3. Select **Closed testing → Alpha** from the dropdown
4. Adjust release notes if needed (pre-filled from Internal)
5. Click **Next → Start rollout to Closed testing**

**For your current workflow (build fresh AAB each release), always use the fresh upload path above.** Promote is only useful if you start using Internal testing as a staging step before Alpha.

---

## Common Issues

### File Lock Errors (Unable to delete directory)

**Symptom:** Build fails with `Unable to delete directory 'node_modules\@capacitor\...\build\generated'`

**Causes & Fixes:**
- App still running on phone via USB → disconnect phone, swipe app away from recent apps
- OneDrive/Google Drive syncing the project folder → remove project from sync list
- Antivirus scanning build files → exclude `C:\Dev\corecash` from antivirus
- Previous build hung → restart computer

### Version Numbers Out of Sync

**Symptom:** Settings page shows different version than Google Play Store

**Fix:** Run `node update-version.js` to sync `package.json` and `build.gradle`

### Camera/Gallery Not Working

**Symptom:** "Could not scan receipt" error after taking photo

**Diagnose:** Use Chrome DevTools remote debugging:
1. Connect phone via USB with USB Debugging enabled
2. Open Chrome → `chrome://inspect/#devices`
3. Click `inspect` next to the WebView
4. Check Console tab for actual error

**Common fix:** Ensure `INTERNET` permission exists in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### AGP Upgrade Assistant Keeps Appearing

**DO NOT click "Run selected steps".** This will upgrade AGP/Gradle and break Capacitor compatibility.

**Fix:** Just close the Upgrade Assistant tab each time it appears.

### "Version code X has already been used" on Play Console Upload

**Symptom:** Play Console rejects the AAB during Step PC5 upload with this error.

**Cause:** Your `versionCode` in `build.gradle` matches one already uploaded to Play Console, even if that release was later discarded. Play Console permanently burns every versionCode integer you've ever used.

**Fix:** Run `node update-version.js` and bump versionCode to a higher number. You MUST bump versionCode even if you only changed the versionName. Then rebuild the signed AAB and retry the upload.

### "Create new release" Button is Greyed Out

**Symptom:** In Play Console Step PC4, the Create new release button won't click.

**Cause:** A previous release is still "In review" or sitting as a "Draft" on the Alpha track.

**Fix:** Scroll down on the Releases tab. Find the blocking release. Either wait for review to complete, or click **Manage release → Discard release** to clear the draft. The button will then become clickable.

### Can't Edit Release Notes After Rollout

**Symptom:** Spotted a typo in release notes after clicking Rollout in Step PC8.

**Fix:** You can't. Notes on a completed rollout are locked forever. You have to create a new release with a higher versionCode to ship corrected notes. Always review release notes carefully in Step PC7 before clicking Start rollout.

---

## File Locations Reference

| File | Path | Purpose |
|------|------|---------|
| Main React code | `C:\Dev\corecash\src\App.js` | App logic and UI |
| Package config | `C:\Dev\corecash\package.json` | npm version + dependencies |
| Capacitor config | `C:\Dev\corecash\capacitor.config.ts` | Plugin settings, webContentsDebuggingEnabled |
| Android manifest | `C:\Dev\corecash\android\app\src\main\AndroidManifest.xml` | Permissions, FileProvider |
| Android version | `C:\Dev\corecash\android\app\build.gradle` | versionCode, versionName |
| File paths | `C:\Dev\corecash\android\app\src\main\res\xml\file_paths.xml` | FileProvider directories |
| Version script | `C:\Dev\corecash\update-version.js` | Auto-sync version across files |
| Debug APK output | `C:\Dev\corecash\android\app\build\outputs\apk\debug\app-debug.apk` | Installable APK for Pixel 7 sideload |
| Signed Release AAB output | `C:\Dev\corecash\android\app\build\outputs\bundle\release\app-release.aab` | Upload to Play Console Closed Testing |

---

## When to Run Each Step (Cheat Sheet)

| What changed? | Update version? | npm run build? | cap sync? | Android Studio build? | Play Console upload? |
|---|---|---|---|---|---|
| `src/App.js` only (local testing) | No | ✅ Yes | ✅ Yes | ✅ Yes (APK) | No |
| `AndroidManifest.xml` only (local testing) | No | No | No | ✅ Yes (APK) | No |
| Both React + Android files (local testing) | No | ✅ Yes | ✅ Yes | ✅ Yes (APK) | No |
| Releasing to Alpha testers via Play Store | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (Signed AAB) | ✅ Yes |
| Installed new Capacitor plugin | No | ✅ Yes | ✅ Yes | ✅ Yes | Only if releasing |

---

## Required Permissions in AndroidManifest.xml

These should ALWAYS be present in `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Network (for API calls to Anthropic) -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Notifications -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Camera -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

<!-- Gallery -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

Plus the `<queries>` block (direct child of `<manifest>`, NOT inside `<application>`):

```xml
<queries>
    <intent>
        <action android:name="android.media.action.IMAGE_CAPTURE" />
    </intent>
    <intent>
        <action android:name="android.media.action.VIDEO_CAPTURE" />
    </intent>
    <intent>
        <action android:name="android.intent.action.PICK" />
    </intent>
    <intent>
        <action android:name="android.intent.action.GET_CONTENT" />
    </intent>
</queries>
```
