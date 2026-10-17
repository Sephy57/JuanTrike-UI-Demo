import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DemoProvider, useDemoControls } from './src/booking/DemoContext';
import { DemoPanel } from './src/components/DemoPanel';
import { ApplicationInfoModal } from './src/components/ApplicationInfoModal';
import { PassengerScreen } from './src/screens/PassengerScreen';
import { DriverScreen } from './src/screens/DriverScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';

function Shell() {
  const { mode, setMode } = useDemoControls();
  const [started, setStarted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  if (!started) {
    return (
      <>
        <WelcomeScreen
          onOpenInfo={() => setInfoOpen(true)}
          onChoose={(chosen) => {
            setMode(chosen);
            setStarted(true);
          }}
        />
        <ApplicationInfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} />
      </>
    );
  }

  return (
    <>
      {mode === 'passenger' ? (
        <PassengerScreen onOpenPanel={() => setPanelOpen(true)} onOpenInfo={() => setInfoOpen(true)} />
      ) : (
        <DriverScreen onOpenPanel={() => setPanelOpen(true)} onOpenInfo={() => setInfoOpen(true)} />
      )}
      <DemoPanel visible={panelOpen} onClose={() => setPanelOpen(false)} />
      <ApplicationInfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} />
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
