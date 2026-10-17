import { router } from 'expo-router';
import { DemoPanel } from '../components/DemoPanel';
import { useDemoControls } from '../booking/DemoContext';
import { routeForMode } from '../navigation/routes';

export default function DemoPanelRoute() {
  const { mode, switchMode } = useDemoControls();

  return (
    <DemoPanel
      visible
      onClose={() => router.back()}
      onSwitchRole={() => {
        const nextMode = mode === 'passenger' ? 'driver' : 'passenger';
        switchMode(mode, nextMode);
        router.replace(routeForMode(nextMode));
      }}
    />
  );
}
