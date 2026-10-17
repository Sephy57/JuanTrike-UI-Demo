import { router } from 'expo-router';
import { useDemoControls } from '../booking/DemoContext';
import { routeForMode } from '../navigation/routes';
import { WelcomeScreen } from '../screens/WelcomeScreen';

export default function WelcomeRoute() {
  const { setMode } = useDemoControls();

  return (
    <WelcomeScreen
      onChoose={(mode) => {
        setMode(mode);
        router.replace(routeForMode(mode));
      }}
    />
  );
}
