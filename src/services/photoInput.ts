import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition'

// On-device photo → OCR. The user shoots/picks an extract or a payment
// screenshot; ML Kit (native, on-device) extracts the text, which is then fed
// to the same expense parser as voice dictation — no server-side vision needed.
// OCR is native-only; on web it returns null and the UI falls back to manual.

export function isPhotoOcrSupported(): boolean {
  return Capacitor.isNativePlatform()
}

/** Captures/picks a photo and returns its recognized text, or null if unavailable. */
export async function capturePhotoText(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null

  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
    quality: 80,
    correctOrientation: true,
  })
  if (!photo.base64String) return null

  const { text } = await CapacitorPluginMlKitTextRecognition.detectText({
    base64Image: photo.base64String,
  })
  return text?.trim() || null
}
