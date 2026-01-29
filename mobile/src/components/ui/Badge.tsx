import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const theme = useTheme();
  // Ensure themeColors is always defined - use default colors if theme not available
  const themeColors = (theme && theme.colors) ? theme.colors : colors;

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
      case 'default':
        return {
          backgroundColor: themeColors.primary.DEFAULT,
        };
      case 'secondary':
        return {
          backgroundColor: themeColors.secondary.DEFAULT,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: themeColors.border.DEFAULT,
        };
      case 'destructive':
        return {
          backgroundColor: themeColors.destructive.DEFAULT,
        };
      case 'success':
        return {
          backgroundColor: themeColors.success,
        };
      case 'warning':
        return {
          backgroundColor: themeColors.warning,
          opacity: 0.9,
        };
      default:
        return {
          backgroundColor: themeColors.primary.DEFAULT,
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
      case 'success':
      case 'warning':
        return '#ffffff';
      default:
        return themeColors.primary.foreground || '#ffffff';
    }
  };

  const badgeStyle = [
    styles.badge,
    getVariantStyle(),
    styles[`size_${size}`],
    style,
  ];

  const badgeTextStyle = [
    styles.text,
    {
      color: getTextColor(),
    },
    styles[`text_${size}`],
    textStyle,
  ];

  const renderChildren = () => {
    return React.Children.map(children, child => {
      if (typeof child === 'string' || typeof child === 'number') {
        return <Text style={badgeTextStyle}>{child}</Text>;
      }
      return child;
    });
  };

  return (
    <View style={badgeStyle}>
      {renderChildren()}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  size_sm: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  size_lg: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  text: {
    fontWeight: typography.fontWeight.semibold, // Bolder for better visibility
    fontFamily: typography.fontFamily.sans,
    letterSpacing: 0.2,
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
});
