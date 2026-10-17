import { router } from 'expo-router';
import { useDemoControls } from '../booking/DemoContext';
import { routeForMode } from '../navigation/routes';
import { DriverScreen } from '../screens/DriverScreen';

export default function DriverRoute() {
  const { switchMode } = useDemoControls();

  return (
    <DriverScreen
      onOpenPanel={() => router.push('/demo-panel')}
      onSwitchMode={() => {
        switchMode('driver', 'passenger');
        router.replace(routeForMode('passenger'));
      }}
    />
  );
}
