import { useCallback, useRef, useState } from 'react';
import { UploadCloud, X, AlertTriangle } from 'lucide-react';
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_EXPECTED_DURATION_SECONDS,
  MAX_UPLOAD_BYTES,
} from '@shared/constants.js';

interface Props {
  onSelected: (file: File, durationSeconds: number) => void;
  onCleared: () => void;
  disabled?: boolean;
}

function validate(file: File): string | null {
  const name = file.name.toLowerCase();
  const extOk = ACCEPTED_EXTENSIONS.some((e) => name.endsWith(e));
  const mimeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type);
  if (!extOk || !mimeOk) return 'Please choose an MP4 or WebM video.';
  if (file.size === 0) return 'That file appears to be empty.';
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `That file is ${mb} MB. This prototype accepts videos up to 20 MB.`;
  }
  return null;
}

export default function VideoUploader({ onSelected, onCleared, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [durationWarning, setDurationWarning] = useState<string | null>(null);

  const accept = useCallback(
    (file: File) => {
      const problem = validate(file);
      if (problem) {
        setError(problem);
        setPreview(null);
        onCleared();
        return;
      }
      setError(null);
      setDurationWarning(null);

      const url = URL.createObjectURL(file);
      // Read duration from a detached element before showing the preview, so we
      // can warn about long videos and hand a real duration to the server.
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        const duration = Number.isFinite(probe.duration) ? probe.duration : 0;
        if (duration > MAX_EXPECTED_DURATION_SECONDS) {
          setDurationWarning(
            `This video is ${Math.round(duration)}s. This prototype is tuned for pitches of ${MAX_EXPECTED_DURATION_SECONDS}s or less, so analysis may be less precise.`
          );
        }
        setPreview({ url, name: file.name });
        onSelected(file, duration);
      };
      probe.onerror = () => {
        setError('We could not read that video. Try re-exporting it as MP4.');
        URL.revokeObjectURL(url);
        onCleared();
      };
      probe.src = url;
    },
    [onSelected, onCleared]
  );

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setError(null);
    setDurationWarning(null);
    if (inputRef.current) inputRef.current.value = '';
    onCleared();
  };

  if (preview) {
    return (
      <div className="vcm-enter">
        <div className="overflow-hidden rounded-sm border border-line bg-black">
          <video src={preview.url} controls className="aspect-video w-full" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="truncate text-sm text-ink-muted">{preview.name}</p>
          <button
            type="button"
            onClick={clear}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-ink-muted underline underline-offset-4 hover:text-ink"
          >
            <X size={14} aria-hidden="true" />
            Choose a different video
          </button>
        </div>
        {durationWarning && (
          <p className="mt-3 flex items-start gap-2 border-l-2 border-signal-medium bg-signal-medium/5 py-2 pl-3 text-sm text-signal-medium">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            {durationWarning}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) accept(file);
        }}
        className={[
          'rounded-sm border border-dashed p-8 text-center transition-colors sm:p-12',
          dragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-paper-raised',
        ].join(' ')}
      >
        <UploadCloud
          size={28}
          className="mx-auto text-ink-muted"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="mt-4 font-display text-lg">Drop your pitch video here</p>
        <p className="mt-1 text-sm text-ink-muted">MP4 or WebM, up to 20 MB, 60 seconds or less</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-sm border border-ink px-5 py-2.5 text-sm font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
        >
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.webm,video/mp4,video/webm"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) accept(file);
          }}
        />
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 border-l-2 border-signal-high bg-signal-high/5 py-2 pl-3 text-sm text-signal-high"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
