import React from 'react';
import { cn } from '@/shared/lib/utils';
import VedhireBrandMark from '@/shared/components/VedhireBrandMark';
import VedhireWordmark, { PRODUCT_TAGLINE } from '@/shared/components/VedhireWordmark';

/**
 * Logo + vedhire.ai wordmark, with tagline below both.
 * @param {'light' | 'dark'} variant
 */
export default function VedhireBrandLockup({
  variant = 'light',
  className,
  markSize = 30,
  showTagline = true,
  tagline = PRODUCT_TAGLINE,
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={cn('vedhire-brand-lockup', `vedhire-brand-lockup--${variant}`, className)}
      data-testid="vedhire-brand-lockup"
      {...rest}
    >
      <div className="vedhire-brand-lockup-row">
        <div className="vedhire-brand-lockup-mark" aria-hidden="true">
          <VedhireBrandMark size={markSize} />
        </div>
        <VedhireWordmark variant={variant} className="vedhire-brand-lockup-name" />
      </div>
      {showTagline ? (
        <div className="vedhire-brand-lockup-tagline">{tagline}</div>
      ) : null}
    </Tag>
  );
}
