import { useEffect, useMemo, useState } from "react";

type StreamKind = "img" | "video";

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
  const active = candidates[index];
  const kind = active ? detectKind(active) : "img";

  useEffect(() => {
    setIndex(0);
  }, [streamUrl]);

  function tryNextSource() {
    if (index < candidates.length - 1) {
      setIndex((prev) => prev + 1);
    }
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
    <>
      <img
        src={active}
        alt="Camera stream"
        className={`absolute inset-0 h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        onError={tryNextSource}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      {index >= candidates.length - 1 ? (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/85 text-center text-xs text-slate-300">
          <div>
            <p className="font-semibold text-slate-200">Stream no disponible</p>
            <p className="mt-1 text-slate-400">Verifica la URL o el origen de video.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
