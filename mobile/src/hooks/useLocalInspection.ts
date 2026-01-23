import { useQuery } from '@tanstack/react-query';
import { localDatabase } from '../services/localDatabase';
import { syncManager } from '../services/syncManager';
import { useEffect, useState } from 'react';

/**
 * Hook to get local inspection data and sync status
 */
export function useLocalInspection(inspectionId: string | undefined) {
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending count
  useEffect(() => {
    const loadPendingCount = async () => {
      if (inspectionId) {
        const count = await syncManager.getPendingCount();
        setPendingCount(count);
      }
    };
    loadPendingCount();
    
    // Refresh pending count periodically
    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, [inspectionId]);

  const { data: localInspection } = useQuery({
    queryKey: ['local-inspection', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return null;
      const local = await localDatabase.getInspection(inspectionId);
      if (local) {
        return {
          id: local.id,
          propertyId: local.property_id || undefined,
          blockId: local.block_id || undefined,
          templateId: local.template_id,
          assignedToId: local.assigned_to_id || undefined,
          scheduledDate: local.scheduled_date || undefined,
          status: local.status as any,
          type: local.type,
          notes: local.notes || undefined,
          createdAt: local.created_at,
          updatedAt: local.updated_at,
          templateSnapshotJson: JSON.parse(local.template_snapshot_json),
          syncStatus: local.sync_status,
        };
      }
      return null;
    },
    enabled: !!inspectionId,
  });

  const { data: localEntries = [] } = useQuery({
    queryKey: ['local-entries', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return [];
      const entries = await localDatabase.getEntries(inspectionId);
      return entries.map(entry => ({
        id: entry.id,
        inspectionId: entry.inspection_id,
        sectionRef: entry.section_ref,
        fieldKey: entry.field_key,
        fieldType: entry.field_type,
        valueJson: entry.value_json ? JSON.parse(entry.value_json) : undefined,
        note: entry.note || undefined,
        photos: [], // Photos loaded separately
        maintenanceFlag: entry.maintenance_flag === 1,
        markedForReview: entry.marked_for_review === 1,
        syncStatus: entry.sync_status,
      }));
    },
    enabled: !!inspectionId,
  });

  return {
    localInspection,
    localEntries,
    pendingCount,
    refreshPendingCount: async () => {
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
    },
  };
}

