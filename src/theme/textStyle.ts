import type { TextStyle } from 'react-native';
import { font } from './fonts';

// The new type scale. Old screens keep using `typography` until they are migrated.
export const textStyle = {
  display: { fontFamily: font.extrabold, fontSize: 64, lineHeight: 70 },
  hero: { fontFamily: font.extrabold, fontSize: 40, lineHeight: 46 },
  title: { fontFamily: font.bold, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: font.bold, fontSize: 20, lineHeight: 26 },
  label: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;
