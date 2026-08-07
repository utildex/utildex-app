export default {
  // Prompt phase
  DOWNLOAD_BUTTON: 'Download',
  NOT_NOW_BUTTON: 'Not now',
  SIZE_PREFIX: 'Size: ',
  STORED_IN: 'stored securely in your browser',
  PRE_DOWNLOAD_NOTE_DEFAULT: 'Once downloaded, everything works fully offline.',

  // Downloading phase
  DOWNLOADING_TITLE: 'Downloading…',
  CANCEL_BUTTON: 'Cancel',

  // Verifying phase
  VERIFYING_TITLE: 'Verifying integrity…',
  VERIFYING_MESSAGE: 'Checking the download to make sure nothing was corrupted.',

  // Complete phase
  COMPLETE_TITLE: 'Ready',
  COMPLETE_MESSAGE: 'Everything is set up. You can now use this feature offline.',

  // Refused phase
  REFUSED_TITLE: 'Download skipped',
  DISMISS_BUTTON: 'Dismiss',

  // Error phase
  ERROR_TITLE: 'Download failed',
  RETRY_BUTTON: 'Try again',
  ERROR_DISMISS_BUTTON: 'Dismiss',
  ERROR_PREFIX: 'Error: ',
} as const;
