import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider, useDemo } from './src/booking/DemoContext';
import { DemoPanel } from './src/components/DemoPanel';
import { PassengerScreen } from './src/screens/PassengerScreen';
import { DriverScreen } from './src/screens/DriverScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

function Shell() {
  const { mode, setMode } = useDemo();
  const [started, setStarted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  if (!started) {
    return (
      <WelcomeScreen
        onChoose={(chosen) => {
          setMode(chosen);
          setStarted(true);
        }}
      />
    );
  }

  return (
    <>
      {mode === 'passenger' ? (
        <PassengerScreen onOpenPanel={() => setPanelOpen(true)} />
      ) : (
        <DriverScreen onOpenPanel={() => setPanelOpen(true)} />
      )}
      <DemoPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DemoProvider>
        <StatusBar style="dark" />
        <Shell />
      </DemoProvider>
    </SafeAreaProvider>
  );
}
