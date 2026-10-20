/**
 * Opens the microphone for voice messages with clear, human error messages.
 * Works in browsers and in the Android app (WebView) as long as the app has
 * the microphone permission.
 */
export async function getMicStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "Microphone isn't available here. Open Fly in Chrome or update the app.",
    );
  }
  const attempts: MediaStreamConstraints[] = [
    { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } },
    { audio: true },
  ];
  let last: unknown;
  for (const c of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (e) {
      last = e;
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") break;
    }
  }
  const name = (last as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    throw new Error(
      "Microphone permission is off. Allow it in your phone Settings → Apps → Fly → Permissions → Microphone.",
    );
  }
  if (name === "NotFoundError") throw new Error("No microphone was found on this device.");
  if (name === "NotReadableError") {
    throw new Error("The microphone is busy in another app. Close it and try again.");
  }
  throw new Error("Could not start the microphone — please try again.");
}

/** Picks a recording format the current device can actually produce. */
export function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ].find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
}

/** Retries an upload once on a flaky mobile network. */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 1200));
    return fn();
  }
}

/**
 * Fallback for app wrappers (e.g. WebIntoApp) whose WebView blocks in-page
 * microphone access even when the phone permission is granted: opens the
 * phone's own voice recorder / audio picker and returns the chosen file.
 */
export function pickNativeAudio(): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.setAttribute("capture", "microphone");
    input.style.display = "none";
    input.onchange = () => {
      const f = input.files?.[0] ?? null;
      input.remove();
      resolve(f);
    };
    document.body.appendChild(input);
    input.click();
  });
}
