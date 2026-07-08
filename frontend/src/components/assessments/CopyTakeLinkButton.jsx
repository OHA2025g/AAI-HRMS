import React from 'react';
import { Button } from '../ui/button';
import { Link2 } from 'lucide-react';
import { copyTakeUrl } from '../../lib/assessmentLinks';

export default function CopyTakeLinkButton({ takeUrl, size = 'sm', variant = 'outline', className = '', label = 'Copy assessment take link', commandStyle = false, children }) {
  if (!takeUrl) return null;
  if (commandStyle) {
    return (
      <button
        type="button"
        className={className || 'as-iconbtn'}
        data-testid="copy-take-link-btn"
        aria-label={label}
        onClick={() => copyTakeUrl(takeUrl)}
      >
        {children || '🔗 Copy'}
      </button>
    );
  }
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      data-testid="copy-take-link-btn"
      aria-label={label}
      onClick={() => copyTakeUrl(takeUrl)}
    >
      <Link2 className="w-4 h-4 mr-1" />
      Copy link
    </Button>
  );
}
