import { router } from 'expo-router';
import { useDemoControls } from '../booking/DemoContext';
import { routeForMode } from '../navigation/routes';
import { PassengerScreen } from '../screens/PassengerScreen';

export default function PassengerRoute() {
  const { switchMode } = useDemoControls();

  return (
    <PassengerScreen
      onOpenPanel={() => router.push('/demo-panel')}
      onSwitchMode={() => {
        switchMode('passenger', 'driver');
        router.replace(routeForMode('driver'));
      }}
    />
  );
}
