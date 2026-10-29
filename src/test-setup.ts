import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  arrowDownCircleOutline,
  bulbOutline,
  calendarOutline,
  cameraOutline,
  checkmarkCircleOutline,
  clipboardOutline,
  cloudOfflineOutline,
  constructOutline,
  folderOpenOutline,
  helpCircleOutline,
  imageOutline,
  leafOutline,
  locationOutline,
  mapOutline,
  refreshOutline,
  removeCircleOutline,
  timeOutline,
  trailSignOutline,
  warningOutline,
  waterOutline,
} from 'ionicons/icons';

// Polyfills for running unit tests under jsdom (the default Vitest environment).
// Ionic components such as ion-menu and ion-split-pane query `window.matchMedia`,
// which jsdom does not implement.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

addIcons({
  'alert-circle-outline': alertCircleOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'bulb-outline': bulbOutline,
  'calendar-outline': calendarOutline,
  'camera-outline': cameraOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'clipboard-outline': clipboardOutline,
  'cloud-offline-outline': cloudOfflineOutline,
  'construct-outline': constructOutline,
  'folder-open-outline': folderOpenOutline,
  'help-circle-outline': helpCircleOutline,
  'image-outline': imageOutline,
  'leaf-outline': leafOutline,
  'tree-outline': leafOutline,
  'location-outline': locationOutline,
  'map-outline': mapOutline,
  'refresh-outline': refreshOutline,
  'remove-circle-outline': removeCircleOutline,
  'signpost-outline': trailSignOutline,
  'trail-sign-outline': trailSignOutline,
  'time-outline': timeOutline,
  'warning-outline': warningOutline,
  'water-outline': waterOutline,
});
