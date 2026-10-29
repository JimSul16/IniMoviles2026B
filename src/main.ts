import { bootstrapApplication } from '@angular/platform-browser';
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

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

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

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
