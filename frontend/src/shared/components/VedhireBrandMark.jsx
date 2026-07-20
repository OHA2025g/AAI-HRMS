import React from 'react';
import { cn } from '@/shared/lib/utils';

export const VEDHIRE_LOGOMARK_SRC = '/brand/vedhire-logomark.svg';

/**
 * Vedhire logomark (transparent strokes + gold bindu).
 * Place inside a dark brand-mark container so the light strokes remain visible.
 */
export default function VedhireBrandMark({ className, size = 28, alt = '' }) {
  return (
    <img
      src={VEDHIRE_LOGOMARK_SRC}
      alt={alt}
      width={size}
      height={size}
      decoding="async"
      className={cn('vedhire-brand-mark-img', className)}
      data-testid="vedhire-brand-mark"
    />
  );
}
