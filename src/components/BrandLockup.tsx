import React from 'react';
import { Image } from 'react-native';

/** Owner-approved colorful artwork for customer-facing brand lockups. */
export function BrandLogo({ width = 160, height = 128 }: { width?: number; height?: number }) {
  return (
    <Image
      accessible
      accessibilityRole="image"
      accessibilityLabel="JuanTrike logo"
      testID="juantrike-brand-logo"
      source={require('../../assets/juantrike-logo.png')}
      resizeMode="contain"
      style={{ width, height }}
    />
  );
}

/** Use the project-owned JuanTrike tricycle mark that also ships as the app icon. */
export function BrandMark({ size = 52 }: { size?: number }) {
  return (
    <Image
      accessible
      accessibilityRole="image"
      accessibilityLabel="JuanTrike"
      source={require('../../assets/android-icon-foreground.png')}
      resizeMode="contain"
      style={{ width: size, height: size * 1.12 }}
    />
  );
}
