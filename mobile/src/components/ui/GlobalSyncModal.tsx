import React from 'react';
import SyncProgressModal from './SyncProgressModal';
import { useSync } from '../../contexts/SyncContext';

export default function GlobalSyncModal() {
  const { showSyncModal, setShowSyncModal, syncProgress } = useSync();

  return (
    <SyncProgressModal
      visible={showSyncModal}
      progress={syncProgress}
      onClose={() => setShowSyncModal(false)}
    />
  );
}

