import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider } from '../src/booking/DemoContext';
import { ApplicationInfoContent } from '../src/components/ApplicationInfoModal';

describe('ApplicationInfoModal', () => {
  it('states the prototype, payment, movement, and coverage limits plainly', async () => {
    const screen = await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 393, height: 873 }, insets: { top: 24, right: 0, bottom: 24, left: 0 } }}>
        <DemoProvider>
        <ApplicationInfoContent onClose={jest.fn()} />
        </DemoProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByText('This is a presentation prototype.')).toBeTruthy();
    expect(screen.getByText(/Payments are not processed/)).toBeTruthy();
    expect(screen.getByText(/Driver movement may be simulated/)).toBeTruthy();
    expect(screen.getByText(/do not represent official approval/)).toBeTruthy();
  });
});
