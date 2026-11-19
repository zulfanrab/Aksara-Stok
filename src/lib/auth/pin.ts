/**
 * Keamanan Akses Aplikasi (PIN Gate)
 * PT Aksara Riksa Perdana
 */

export const APP_PIN = "9999";
export const PIN_STORAGE_KEY = "aksara_app_pin_unlocked_v1";

/**
 * Validasi PIN pembuka akses aplikasi
 */
export function validateAppPin(inputPin: string): boolean {
  return inputPin.trim() === APP_PIN;
}

/**
 * Kunci aplikasi secara manual (menghapus status session dan memicu event lock)
 */
export function lockApp(): void {
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(PIN_STORAGE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event("aksara-lock-app"));
  }
}
