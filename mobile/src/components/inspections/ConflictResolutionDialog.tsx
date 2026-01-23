import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react-native';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { LocalInspectionEntry } from '../../services/localDatabase';
import type { InspectionEntry } from '../../services/inspections';

interface ConflictResolutionDialogProps {
  visible: boolean;
  localEntry: LocalInspectionEntry;
  serverEntry: InspectionEntry;
  onResolve: (choice: 'local' | 'server' | 'merge') => void;
  onCancel: () => void;
}

export function ConflictResolutionDialog({
  visible,
  localEntry,
  serverEntry,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  const localValue = localEntry.value_json ? JSON.parse(localEntry.value_json) : null;
  const serverValue = serverEntry.valueJson;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Card style={styles.dialog}>
          <View style={styles.header}>
            <AlertCircle size={24} color={colors.warning} />
            <Text style={styles.title}>Conflict Detected</Text>
          </View>

          <Text style={styles.description}>
            This entry was modified both locally and on the server. Choose which version to keep:
          </Text>

          <View style={styles.options}>
            {/* Local Version */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => onResolve('local')}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Keep Local Version</Text>
                <CheckCircle2 size={20} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.optionValue}>
                {localValue ? JSON.stringify(localValue, null, 2) : '(empty)'}
              </Text>
              {localEntry.note && (
                <Text style={styles.optionNote}>Note: {localEntry.note}</Text>
              )}
            </TouchableOpacity>

            {/* Server Version */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => onResolve('server')}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>Keep Server Version</Text>
                <CheckCircle2 size={20} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.optionValue}>
                {serverValue ? JSON.stringify(serverValue, null, 2) : '(empty)'}
              </Text>
              {serverEntry.note && (
                <Text style={styles.optionNote}>Note: {serverEntry.note}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actions}>
            <Button
              title="Keep Local"
              onPress={() => onResolve('local')}
              variant="primary"
              size="sm"
              style={styles.actionButton}
            />
            <Button
              title="Keep Server"
              onPress={() => onResolve('server')}
              variant="secondary"
              size="sm"
              style={styles.actionButton}
            />
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              size="sm"
              style={styles.actionButton}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  dialog: {
    width: '100%',
    maxWidth: 500,
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[4],
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.sm,
  },
  options: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  option: {
    padding: spacing[3],
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  optionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  optionValue: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontFamily: 'monospace',
    marginBottom: spacing[1],
  },
  optionNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
});

