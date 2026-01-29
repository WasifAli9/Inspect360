import { Dimensions, PixelRatio, Platform } from 'react-native';

// Base dimensions (iPhone 14 Pro - 393x852)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Get current window dimensions (updates on fold/unfold)
const getWindowDimensions = () => {
  return Dimensions.get('window');
};

// Scale factor based on screen width
const scale = (size: number, screenWidth?: number): number => {
  const { width } = screenWidth !== undefined ? { width: screenWidth } : getWindowDimensions();
  const scaleFactor = width / BASE_WIDTH;
  return Math.round(size * scaleFactor);
};

// Scale factor based on screen height
const verticalScale = (size: number, screenHeight?: number): number => {
  const { height } = screenHeight !== undefined ? { height: screenHeight } : getWindowDimensions();
  const scaleFactor = height / BASE_HEIGHT;
  return Math.round(size * scaleFactor);
};

// Moderate scale - combines width and height scaling
// For foldable devices, we cap the scaling to prevent buttons from becoming too large
const moderateScale = (size: number, factor: number = 0.5, screenWidth?: number): number => {
  const { width } = screenWidth !== undefined ? { width: screenWidth } : getWindowDimensions();
  const scaleFactor = width / BASE_WIDTH;
  // Cap scaling factor for very large screens (foldable unfolded) to maintain consistency
  const cappedFactor = Math.min(scaleFactor, 1.5); // Max 1.5x scaling
  return Math.round(size + (cappedFactor - 1) * size * factor);
};

// Font scaling with pixel ratio
const fontScale = (size: number, screenWidth?: number): number => {
  const { width } = screenWidth !== undefined ? { width: screenWidth } : getWindowDimensions();
  const scaleFactor = width / BASE_WIDTH;
  const pixelRatio = PixelRatio.getFontScale();
  // Cap font scaling similarly
  const cappedFactor = Math.min(scaleFactor, 1.5);
  return Math.round(size * cappedFactor * pixelRatio);
};

// Get responsive padding
const getResponsivePadding = (base: number, screenWidth?: number): number => {
  return moderateScale(base, 0.3, screenWidth);
};

// Get responsive margin
const getResponsiveMargin = (base: number, screenWidth?: number): number => {
  return moderateScale(base, 0.3, screenWidth);
};

// Get responsive button height - ensures consistent button sizes across devices
const getButtonHeight = (size: 'sm' | 'md' | 'lg' = 'md', screenWidth?: number): number => {
  const baseHeights = {
    sm: 32,
    md: 44,
    lg: 52,
  };
  // Use smaller scaling factor for button heights to maintain consistency
  const { width } = screenWidth !== undefined ? { width: screenWidth } : getWindowDimensions();
  const scaleFactor = width / BASE_WIDTH;
  const cappedFactor = Math.min(scaleFactor, 1.3); // Cap at 1.3x for buttons
  return Math.round(baseHeights[size] + (cappedFactor - 1) * baseHeights[size] * 0.2);
};

// Get responsive font size
const getFontSize = (size: number, screenWidth?: number): number => {
  return fontScale(size, screenWidth);
};

// Check if device is tablet or foldable
const isTablet = (screenWidth?: number, screenHeight?: number): boolean => {
  const { width, height } = screenWidth !== undefined && screenHeight !== undefined
    ? { width: screenWidth, height: screenHeight }
    : getWindowDimensions();
  const aspectRatio = height / width;
  return (
    (width >= 600 && height >= 600) ||
    (Platform.OS === 'ios' && width >= 600) ||
    (Platform.OS === 'android' && width >= 600) ||
    aspectRatio < 1.6
  );
};

// Check if device is small
const isSmallDevice = (screenWidth?: number): boolean => {
  const { width } = screenWidth !== undefined ? { width: screenWidth } : getWindowDimensions();
  return width < 360;
};

// Check if device is large (tablet/foldable unfolded)
const isLargeDevice = (screenWidth?: number): boolean => {
  const { width } = screenWidth !== undefined ? { width: screenWidth } : getWindowDimensions();
  return width >= 768;
};

// Export initial dimensions for backward compatibility
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getWindowDimensions();

export {
  scale,
  verticalScale,
  moderateScale,
  fontScale,
  getResponsivePadding,
  getResponsiveMargin,
  getButtonHeight,
  getFontSize,
  isTablet,
  isSmallDevice,
  isLargeDevice,
  getWindowDimensions,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};

