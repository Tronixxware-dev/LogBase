// Adds what the store apps need to the Android and iPhone projects that Capacitor creates (camera for the barcode scanner
// and product photos, and the answers the stores ask for). Safe to run again: it only adds what is missing.
// It runs by itself at the end of "npm run add:android", "npm run add:ios" and "npm run sync".
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------- Android ---------------------------- */
const manifestPath = join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (existsSync(manifestPath)) {
  let xml = readFileSync(manifestPath, 'utf8');
  const lines = [
    ['android.permission.CAMERA', '<uses-permission android:name="android.permission.CAMERA" />'],
    ['android.hardware.camera"', '<uses-feature android:name="android.hardware.camera" android:required="false" />'],
    ['android.hardware.camera.autofocus', '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />'],
  ];
  const missing = lines.filter(([needle]) => !xml.includes(needle)).map(([, line]) => `    ${line}`);
  if (missing.length > 0) {
    xml = xml.replace('</manifest>', `${missing.join('\n')}\n</manifest>`);
    writeFileSync(manifestPath, xml);
    console.log(`Android: added ${missing.length} line(s) to AndroidManifest.xml`);
  } else {
    console.log('Android: AndroidManifest.xml already has the lines it needs');
  }
}

/* ----------------------------- iPhone ---------------------------- */
const plistPath = join(root, 'ios', 'App', 'App', 'Info.plist');
if (existsSync(plistPath)) {
  let plist = readFileSync(plistPath, 'utf8');
  const entries = [
    ['NSCameraUsageDescription', '<string>LogBase uses the camera to scan barcodes and to take photos of your products.</string>'],
    ['NSPhotoLibraryUsageDescription', '<string>LogBase lets you choose photos of your products, your logo and your receipts.</string>'],
    // the app only uses the encryption that comes with iOS (HTTPS), so the export-compliance question is answered with "no"
    ['ITSAppUsesNonExemptEncryption', '<false/>'],
  ];
  const missing = entries.filter(([key]) => !plist.includes(`<key>${key}</key>`));
  if (missing.length > 0) {
    const block = missing.map(([key, value]) => `\t<key>${key}</key>\n\t${value}\n`).join('');
    const at = plist.lastIndexOf('</dict>');
    plist = `${plist.slice(0, at)}${block}${plist.slice(at)}`;
    writeFileSync(plistPath, plist);
    console.log(`iPhone: added ${missing.length} line(s) to Info.plist`);
  } else {
    console.log('iPhone: Info.plist already has them');
  }
}

// iPhone AND iPad (and Macs with Apple chips, which run iPad apps). The website inside the app is responsive, so it uses the
// wider layout on an iPad and on a Mac window. Two things must stay true for that to work well:
//  - the project targets both iPhone and iPad (TARGETED_DEVICE_FAMILY = "1,2", Capacitor's default), and
//  - the app is NOT set to "Requires full screen", so an iPad can use Split View and a Mac window can be resized.
const pbxPath = join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
if (existsSync(pbxPath)) {
  const pbx = readFileSync(pbxPath, 'utf8');
  if (/TARGETED_DEVICE_FAMILY = 1;/.test(pbx)) {
    writeFileSync(pbxPath, pbx.replace(/TARGETED_DEVICE_FAMILY = 1;/g, 'TARGETED_DEVICE_FAMILY = "1,2";'));
    console.log('iPhone: set the app to iPhone and iPad');
  } else {
    console.log('iPhone: the app is set to iPhone and iPad');
  }
}
if (existsSync(plistPath)) {
  const plist = readFileSync(plistPath, 'utf8');
  if (plist.includes('<key>UIRequiresFullScreen</key>')) {
    console.log('WARNING: Info.plist has UIRequiresFullScreen. Remove it, or the Mac window cannot be resized.');
  }
}

if (!existsSync(manifestPath) && !existsSync(plistPath)) {
  console.log('Nothing to patch yet: run "npm run add:android" (or add:ios) first.');
}
