import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold';
import { Outfit_700Bold } from '@expo-google-fonts/outfit/700Bold';
import { Outfit_800ExtraBold } from '@expo-google-fonts/outfit/800ExtraBold';

// Passed to useFonts() once, in the root layout.
export const fontAssets = { Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold };

// On Android each weight is its own family, so never combine these with fontWeight.
export const font = {
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extrabold: 'Outfit_800ExtraBold',
} as const;
