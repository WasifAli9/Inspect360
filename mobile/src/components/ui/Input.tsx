import React from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, multiline, secureTextEntry, editable, autoCorrect, required, ...props }: InputProps) {
  const theme = useTheme();
  // Ensure themeColors is always defined - use default colors if theme not available
  const themeColors = (theme && theme.colors) ? theme.colors : colors;
  // Ensure boolean props are actually booleans, not strings
  const safeMultiline = typeof multiline === 'boolean' ? multiline : multiline === true || multiline === 'true';
  const safeSecureTextEntry = typeof secureTextEntry === 'boolean' ? secureTextEntry : secureTextEntry === true || secureTextEntry === 'true';
  const safeEditable = typeof editable === 'boolean' ? editable : editable !== false && editable !== 'false';
  const safeAutoCorrect = typeof autoCorrect === 'boolean' ? autoCorrect : autoCorrect !== false && autoCorrect !== 'false';
  // required is just for display, not passed to TextInput
  const safeRequired = typeof required === 'boolean' ? required : required === true || required === 'true';

  // Convert any boolean props in the spread props to actual booleans
  const safeProps: any = { ...props };
  const booleanProps = ['autoFocus', 'blurOnSubmit', 'caretHidden', 'contextMenuHidden', 'enablesReturnKeyAutomatically', 'selectTextOnFocus', 'showSoftInputOnFocus', 'spellCheck', 'scrollEnabled'];
  booleanProps.forEach(prop => {
    if (prop in safeProps) {
      if (typeof safeProps[prop] === 'string') {
        safeProps[prop] = safeProps[prop].toLowerCase() === 'true';
      } else {
        safeProps[prop] = !!safeProps[prop];
      }
    }
  });

  // Specifically handle autoCapitalize and other string props to ensure they are NOT booleans
  if ('autoCapitalize' in safeProps && typeof safeProps.autoCapitalize === 'boolean') {
    safeProps.autoCapitalize = safeProps.autoCapitalize ? 'sentences' : 'none';
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: themeColors.text.primary }]}>
          {label}
          {safeRequired && <Text style={[styles.required, { color: themeColors.destructive.DEFAULT }]}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            borderColor: themeColors.border.DEFAULT,
            backgroundColor: themeColors.input,
            color: themeColors.text.primary,
          },
          !!error && { borderColor: themeColors.destructive.DEFAULT },
          style
        ]}
        placeholderTextColor={themeColors.text.muted}
        multiline={safeMultiline}
        secureTextEntry={safeSecureTextEntry}
        editable={safeEditable}
        autoCorrect={safeAutoCorrect}
        {...safeProps}
      />
      {error && <Text style={[styles.errorText, { color: themeColors.destructive.DEFAULT }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.sans,
    letterSpacing: 0.2,
  },
  required: {
    // Color set dynamically
  },
  input: {
    borderWidth: 1.5, // Slightly thicker border for modern look
    borderRadius: borderRadius.lg, // More rounded
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    minHeight: 48, // Slightly taller for better touch targets
    fontFamily: typography.fontFamily.sans,
  },
  inputError: {
    // Border color set dynamically
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing[1],
  },
});

