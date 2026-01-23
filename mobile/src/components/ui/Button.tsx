import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'primary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const theme = useTheme();
  // Ensure themeColors is always defined - use default colors if theme not available
  const themeColors = (theme && theme.colors) ? theme.colors : colors;
  
  // Ensure disabled and loading are actual booleans (not strings)
  const safeDisabled = typeof disabled === 'boolean' ? disabled : disabled === true || disabled === 'true';
  const safeLoading = typeof loading === 'boolean' ? loading : loading === true || loading === 'true';

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
      case 'default':
        return {
          backgroundColor: themeColors.primary.DEFAULT,
          borderColor: themeColors.primary.border,
        };
      case 'secondary':
        return {
          backgroundColor: themeColors.secondary.DEFAULT,
          borderColor: themeColors.secondary.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: themeColors.border.dark || themeColors.border.DEFAULT,
        };
      case 'destructive':
        return {
          backgroundColor: themeColors.destructive.DEFAULT,
          borderColor: themeColors.destructive.border,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: themeColors.primary.DEFAULT,
          borderColor: themeColors.primary.border,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'default':
        return themeColors.primary.foreground || '#ffffff';
      case 'secondary':
        return themeColors.secondary.foreground;
      case 'outline':
        return themeColors.text.primary;
      case 'destructive':
        return themeColors.destructive.foreground;
      case 'ghost':
        return themeColors.text.primary;
      default:
        return themeColors.primary.foreground || '#ffffff';
    }
  };

  const buttonStyle = [
    styles.button,
    {
      ...getVariantStyle(),
      borderWidth: variant === 'ghost' ? 0 : 1.5,
    },
    styles[`size_${size}`],
    safeDisabled && styles.disabled,
    !safeDisabled && variant !== 'ghost' && variant !== 'outline' && shadows.sm,
    style,
  ];

  const buttonTextStyle = [
    styles.text,
    {
      color: getTextColor(),
      fontWeight: variant === 'outline' ? typography.fontWeight.medium : typography.fontWeight.semibold,
    },
    styles[`text_${size}`],
    textStyle,
  ];

  const getIndicatorColor = () => {
    if (variant === 'default' || variant === 'destructive' || variant === 'primary') {
      return themeColors.primary.foreground || '#ffffff';
    }
    return themeColors.primary.DEFAULT;
  };

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={safeDisabled || safeLoading}
      activeOpacity={0.7}
    >
      {safeLoading ? (
        <ActivityIndicator color={getIndicatorColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          {size !== 'icon' && <Text style={buttonTextStyle}>{title}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl, // More rounded for modern look
    minHeight: 44, // Better touch targets
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  icon: {
    marginRight: spacing[1],
  },
  size_sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minHeight: 32,
  },
  size_md: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    minHeight: 36,
  },
  size_lg: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    minHeight: 40,
  },
  size_icon: {
    width: 36,
    height: 36,
    padding: 0,
    minHeight: 36,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: typography.fontFamily.sans,
    letterSpacing: 0.3, // Better letter spacing for modern look
  },
  text_sm: {
    fontSize: typography.fontSize.xs,
  },
  text_md: {
    fontSize: typography.fontSize.sm,
  },
  text_lg: {
    fontSize: typography.fontSize.base,
  },
  text_icon: {
    fontSize: 0,
  },
});
