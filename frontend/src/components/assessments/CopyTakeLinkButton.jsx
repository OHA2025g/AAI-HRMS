import React from 'react';
import { Button } from '../ui/button';
import { Link2 } from 'lucide-react';
import { copyTakeUrl } from '../../lib/assessmentLinks';

export default function CopyTakeLinkButton({ takeUrl, size = 'sm', variant = 'outline', className = '', label = 'Copy assessment take link' }) {
  if (!takeUrl) return null;
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
