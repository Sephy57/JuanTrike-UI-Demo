import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { DemoProvider } from '../src/booking/DemoContext';
import { WelcomeScreen } from '../src/screens/WelcomeScreen';

describe('WelcomeScreen', () => {
  it('keeps the mode screen scrollable and both role actions present', async () => {
    const result = await render(
      <DemoProvider>
        <WelcomeScreen onChoose={jest.fn()} />
      </DemoProvider>,
    );

    const scrollView = result.getByTestId('welcome-content-scroll');
    expect(StyleSheet.flatten(scrollView.props.style)).toMatchObject({ flex: 1 });
    expect(result.getByTestId('mode-passenger')).toBeTruthy();
    expect(result.getByTestId('mode-driver')).toBeTruthy();
    expect(result.getByRole('button', { name: 'About this app' })).toBeTruthy();
    expect(result.getByTestId('juantrike-brand-logo')).toBeTruthy();
    expect(result.queryAllByTestId('welcome-feature-row')).toHaveLength(0);
  });

  it('keeps developer route detail off the mode-selection screen', async () => {
    const result = await render(
      <DemoProvider>
        <WelcomeScreen onChoose={jest.fn()} />
      </DemoProvider>,
    );

    expect(result.queryByText(/OpenStreetMap route · \d+/)).toBeNull();
    expect(result.queryByText(/Distance and arrival time are estimates/)).toBeNull();
    expect(result.getByTestId('mode-passenger')).toBeTruthy();
    expect(result.getByTestId('mode-driver')).toBeTruthy();
  });
});
