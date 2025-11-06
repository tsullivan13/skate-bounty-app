// src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

/**
 * Save a string value.
 * On iOS/Android → uses SecureStore
 * On Web → uses AsyncStorage
 */
export async function saveItem(key: string, value: string) {
    try {
        if (isNative && (await SecureStore.isAvailableAsync())) {
            return SecureStore.setItemAsync(key, value);
        }
        return AsyncStorage.setItem(key, value);
    } catch (err) {
        console.warn('saveItem error:', err);
    }
}

/**
 * Delete a stored value.
 * On iOS/Android → uses SecureStore
 * On Web → uses AsyncStorage
 */
export async function deleteItem(key: string) {
    try {
        if (isNative && (await SecureStore.isAvailableAsync())) {
            return SecureStore.deleteItemAsync(key);
        }
        return AsyncStorage.removeItem(key);
    } catch (err) {
        console.warn('deleteItem error:', err);
    }
}
