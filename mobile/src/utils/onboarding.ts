import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_PREFIX = 'onboarding_completed_';

/**
 * Get the storage key for a specific user's onboarding status
 */
function getOnboardingKey(userId: string): string {
  return `${ONBOARDING_COMPLETED_PREFIX}${userId}`;
}

/**
 * Check if onboarding has been completed for a specific user
 * @param userId - The unique user ID (from User.id)
 * @returns true if onboarding has been completed for this user, false otherwise
 */
export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      console.warn('[onboarding] No userId provided, assuming onboarding not completed');
      return false;
    }
    const key = getOnboardingKey(userId);
    const value = await AsyncStorage.getItem(key);
    const completed = value === 'true';
    console.log(`[onboarding] User ${userId} onboarding status: ${completed ? 'completed' : 'not completed'}`);
    return completed;
  } catch (error) {
    console.error('[onboarding] Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as completed for a specific user
 * @param userId - The unique user ID (from User.id)
 */
export async function setOnboardingCompleted(userId: string): Promise<void> {
  try {
    if (!userId) {
      console.warn('[onboarding] No userId provided, cannot mark onboarding as completed');
      return;
    }
    const key = getOnboardingKey(userId);
    await AsyncStorage.setItem(key, 'true');
    console.log(`[onboarding] Marked onboarding as completed for user ${userId}`);
  } catch (error) {
    console.error('[onboarding] Error setting onboarding status:', error);
  }
}

/**
 * Reset onboarding for a specific user (useful for testing)
 * @param userId - The unique user ID (from User.id)
 */
export async function resetOnboarding(userId: string): Promise<void> {
  try {
    if (!userId) {
      console.warn('[onboarding] No userId provided, cannot reset onboarding');
      return;
    }
    const key = getOnboardingKey(userId);
    await AsyncStorage.removeItem(key);
    console.log(`[onboarding] Reset onboarding for user ${userId}`);
  } catch (error) {
    console.error('[onboarding] Error resetting onboarding status:', error);
  }
}

/**
 * Clear onboarding status for all users (useful for cleanup/testing)
 */
export async function clearAllOnboardingStatus(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith(ONBOARDING_COMPLETED_PREFIX));
    if (onboardingKeys.length > 0) {
      await AsyncStorage.multiRemove(onboardingKeys);
      console.log(`[onboarding] Cleared onboarding status for ${onboardingKeys.length} user(s)`);
    }
  } catch (error) {
    console.error('[onboarding] Error clearing all onboarding status:', error);
  }
}

