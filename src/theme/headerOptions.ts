import { colors } from './colors';
import { font } from './fonts';

// One look for every native-stack header (workout, exercises, settings).
export const headerScreenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: font.bold },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
