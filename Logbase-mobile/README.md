# LogBase store apps (Android and iPhone)

These apps are a thin shell around the website. They open `https://mylogbase.com/dashboard`
in a native window, so **every change you put on the website shows up in the apps straight away**, with no new store
release. You only make a new store release when you change something in this folder (icon, permissions, version).

Inside the app the website knows it is in the app (the name `LogBaseApp` is added to the browser name), so it hides the
plans, prices and Pay buttons. The store rules do not allow selling a subscription from inside a store app. People
subscribe on the website; the app only signs in and uses the account.

What is in here:

- `capacitor.config.json`: the app id (`com.mylogbase.app`), name, address, colours and splash settings
- `www/offline.html`: the "You are offline, Try again" page shown when the website cannot be reached
- `assets/`: the app icon and splash screen pictures, drawn from the LogBase logo
- `scripts/patch-native.mjs`: adds the camera permission (barcode scanner and product photos) and the store answers

---

## 1. One-time setup on your computer

1. Install **Node.js 20 or newer** (you already have it for the website).
2. For Android, install **Android Studio** (it brings Java and the Android tools): https://developer.android.com/studio
3. For iPhone you need a **Mac with Xcode**. Windows cannot build an iPhone app. See section 5 if you do not have a Mac.

Open a terminal in this folder (`Logbase-mobile`) and run:

```
npm install
```

## 2. Android

```
npm run add:android
npm run open:android
```

`add:android` creates the Android project, adds the camera permission and makes all the icon sizes. `open:android`
opens it in Android Studio. Wait for the first "Gradle sync" to finish (a few minutes the first time).

**Try it on a phone:** plug in an Android phone with "USB debugging" switched on (or start an emulator in
Android Studio) and press the green Run button.

**What to check before you release:** sign in, record a sale, scan a barcode with the camera, add a product photo,
open Settings (there must be no Billing card), turn the internet off and reopen the app (you should see "You are offline").

### Build the file for Google Play

1. In Android Studio: **Build > Generate Signed App Bundle / APK > Android App Bundle**.
2. Create a new key store (**Create new...**). Save the `.jks` file and its passwords in a safe place **outside** this folder,
   and make a backup copy. If you lose it you cannot update the app. (Google Play App Signing keeps a second copy, but keep yours too.)
3. Choose **release** and finish. The file is `android/app/release/app-release.aab`.
4. In Play Console: **Test and release > Production** (or **Testing > Internal testing** first) **> Create new release**,
   upload the `.aab`, and write the release notes.

Before the first release Play Console also asks you to fill in: Store listing, Content rating, Target audience,
Data safety, App access (give the reviewers a demo login) and a Privacy policy link: `https://mylogbase.com/privacy`.
The wording for these is in the store listing text we prepared earlier.

### Version numbers

Each upload needs a higher number. In `android/app/build.gradle` raise `versionCode` by 1 (2, 3, 4...) and change
`versionName` ("1.0", "1.1"...). On iPhone use the same two numbers in Xcode (Version and Build).

## 3. iPhone (on a Mac)

```
npm install
npm run add:ios
npm run open:ios
```

In Xcode: click **App** in the left list, open **Signing & Capabilities**, tick **Automatically manage signing**, and choose
your team (your Apple Developer account, once Apple has approved it). The bundle id is `com.mylogbase.app`.
Then **Product > Archive > Distribute App > App Store Connect > Upload**. The build appears in App Store Connect
under TestFlight after a few minutes; attach it to a new app version and submit it for review.

## 4. After you change something in this folder

```
npm run sync
```

then build and upload again with a higher version number. You never need this for website changes.

## 5. No Mac?

Use a cloud build service that provides one, for example Codemagic, or rent a Mac in the cloud. They build and
upload the iPhone app for you from this same folder (run `npm run add:ios` as the first build step).

## 6. Things that behave differently in the app

- **Printing** (`window.print`) does not open a print dialog in the app. Receipts can still be shared or sent on WhatsApp.
- **Links to other websites** (for example WhatsApp) open in the phone's own browser, not inside the app.
- **Offline use** works the same as on the website: the website's offline mode keeps working after the first sign-in.
  The very first start needs internet.
- **Apple's review** (guideline 4.2, "minimum functionality") can be strict with apps that wrap a website. What helps:
  a working demo login with sample data in the review notes, the in-app account deletion (already built), the camera
  barcode scanner and the offline mode. If Apple objects, reply in Resolution Center and describe these.
