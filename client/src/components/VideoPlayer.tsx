import { forwardRef, useState } from 'react';
import { FileVideo } from 'lucide-react';
import { formatTimestamp } from '../lib/format.js';

interface Props {
  src: string | null;
  durationSeconds: number;
  /** Shown when no video file is available, e.g. the sample MP4 is not installed. */
  placeholderNote?: string;
}

/**
 * Native HTMLVideoElement wrapper. The ref is forwarded so the analysis page can
 * seek directly without a player abstraction.
 */
const VideoPlayer = forwardRef<HTMLVideoElement, Props>(function VideoPlayer(
  { src, durationSeconds, placeholderNote },
  ref
) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 border border-dashed border-line-strong bg-paper-raised p-6 text-center">
        <FileVideo size={26} className="text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm font-medium">Video preview unavailable</p>
        <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
          {placeholderNote ??
            'The analysis below is complete and fully interactive. Timestamps will not seek without a video file.'}
        </p>
        <p className="text-xs text-ink-muted">Pitch length: {formatTimestamp(durationSeconds)}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-line bg-black">
      <video
        ref={ref}
        src={src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
        onError={() => setFailed(true)}
      />
    </div>
  );
});

export default VideoPlayer;
