import React from 'react';
import { cn } from '@/shared/lib/utils';

export const PRODUCT_NAME = 'vedhire.ai';
export const PRODUCT_NAME_PLAIN = 'vedhire.ai';
export const PRODUCT_TAGLINE = 'Inspired by Ved & Powered by AI';

/**
 * Two-tone wordmark: "vedhire" + purple ".ai"
 * @param {'light' | 'dark'} variant — light = navy/purple on pale surfaces; dark = cream/lavender on indigo UIs
 */
export default function VedhireWordmark({
  variant = 'light',
  className,
  as: Tag = 'span',
  ...rest
}) {
  return (
    <Tag
      className={cn('vedhire-wordmark', `vedhire-wordmark--${variant}`, className)}
      data-testid="vedhire-wordmark"
      {...rest}
    >
      <span className="vedhire-wordmark-name">vedhire</span>
      <span className="vedhire-wordmark-ai">.ai</span>
    </Tag>
  );
}
