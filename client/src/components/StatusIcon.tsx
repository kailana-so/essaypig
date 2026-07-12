import type { ReadingStatus } from '../services/library';

// U+FE0E asks for the monochrome text form of the bolt rather than a colour emoji
export const READING_GLYPH = '⚡︎';
export const FINISHED_GLYPH = '✓';

interface StatusIconProps {
  status?: ReadingStatus;
}

// Always rendered, even when there's no status, so titles stay aligned down the list
const StatusIcon = ({ status }: StatusIconProps) => {
  const glyph = status === 'reading' ? READING_GLYPH : status === 'finished' ? FINISHED_GLYPH : '';
  const label = status === 'reading' ? 'Currently reading' : status === 'finished' ? 'Finished' : '';

  return (
    <span className="status-icon" aria-label={label || undefined} role={label ? 'img' : undefined}>
      {glyph}
    </span>
  );
};

export default StatusIcon;
