import React from 'react';
import { render } from '@testing-library/react-native';
import { BrandLogo } from '../src/components/BrandLockup';

describe('BrandLogo', () => {
  it('uses the owner-approved colorful logo artwork without distorting its aspect ratio', async () => {
    const screen = await render(<BrandLogo width={140} height={100} />);
    const logo = screen.getByRole('image', { name: 'JuanTrike logo' });

    expect(logo.props.source).toEqual(require('../assets/juantrike-logo.png'));
    expect(logo.props.resizeMode).toBe('contain');
    expect(logo.props.style).toMatchObject({ width: 140, height: 100 });
  });
});
