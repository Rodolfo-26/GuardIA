import { useEffect, useMemo, useState } from "react";

type StreamKind = "img" | "video" | "iframe";

function detectKind(url: string): StreamKind {
  const clean = url.toLowerCase();
  if (clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".ogg") || clean.endsWith(".m3u8")) {
    return "video";
  }
  if (clean.includes("/video") || clean.includes("/mjpeg") || clean.includes("/live") || clean.endsWith(".jpg") || clean.endsWith(".jpeg")) {
    return "img";
  }
  return "img";
}

function buildCandidates(streamUrl: string): string[] {
  const trimmed = streamUrl.trim();
  if (!trimmed) return [];

  let base = trimmed;
  try {
    const parsed = new URL(trimmed);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    // Use original value when URL parser fails.
  }

  const candidates = [trimmed, `${base}/video`, `${base}/mjpeg`, `${base}/live`];
  return Array.from(new Set(candidates));
}

function getBaseUrl(streamUrl: string): string {
  const trimmed = streamUrl.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed;
  }
}

export default function CameraStream({
  streamUrl,
  isPlaying,
  offline,
  fit = "cover",
}: {
  streamUrl?: string;
  isPlaying: boolean;
  offline: boolean;
  fit?: "cover" | "contain";
}) {
  const candidates = useMemo(() => buildCandidates(streamUrl ?? ""), [streamUrl]);
  const [index, setIndex] = useState(0);
  const [useIframe, setUseIframe] = useState(false);

  const active = candidates[index];
  const kind = active ? detectKind(active) : "img";
  const baseUrl = useMemo(() => getBaseUrl(streamUrl ?? ""), [streamUrl]);

  useEffect(() => {
    setIndex(0);
    setUseIframe(false);
  }, [streamUrl]);

  function tryNextSource() {
    if (index < candidates.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    setUseIframe(true);
  }

  if (!isPlaying || offline) {
    return null;
  }

  if (!active) {
    return (
      <div className="absolute inset-0 grid place-items-center text-xs text-slate-300">
        Sin URL de stream configurada
      </div>
    );
  }

  if (useIframe) {
    const iframeUrl = baseUrl || streamUrl;
    return (
      <iframe
        title="stream-iframe"
        src={iframeUrl}
        className="absolute inset-0 h-full w-full border-0"
        referrerPolicy="no-referrer"
      />
    );
  }

  if (kind === "video") {
    return (
      <video
        src={active}
        autoPlay
        muted
        playsInline
        controls={false}
        className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        onError={tryNextSource}
      />
    );
  }

  return (
    <img
      src={active}
      alt="Camera stream"
      className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
      onError={tryNextSource}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}
