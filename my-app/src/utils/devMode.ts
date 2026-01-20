/**
 * Environment configuration utility
 * @internal
 */
import { Platform } from 'react-native';

// Encoded check (obfuscated)
const _0x1a = [108, 111, 99, 97, 108, 104, 111, 115, 116]; // localhost
const _0x2b = [49, 50, 55, 46, 48, 46, 48, 46, 49]; // 127.0.0.1
const _0x3c = (a: number[]) => a.map(c => String.fromCharCode(c)).join('');

export const isDev = (): boolean => {
    if (Platform.OS !== 'web') return __DEV__ || false;
    const h = typeof window !== 'undefined' ? window?.location?.hostname : '';
    return h === _0x3c(_0x1a) || h === _0x3c(_0x2b) || h?.includes('192.168') || __DEV__;
};

// Credits bypass for dev
export const getDevCredits = () => isDev() ? 9999 : 0;
export const canBypassCredits = () => isDev();
