import * as FileSystem from 'expo-file-system/legacy';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

class PhotoStorage {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
      }
      this.initialized = true;
      console.log('[PhotoStorage] Initialized successfully');
    } catch (error) {
      console.error('[PhotoStorage] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Save a photo to local file system
   * @param uri - Source URI (can be local file URI or remote URL)
   * @param inspectionId - Inspection ID
   * @param entryId - Entry ID (or 'local_' prefix if offline)
   * @returns Local file path
   */
  async savePhoto(uri: string, inspectionId: string, entryId: string): Promise<string> {
    await this.initialize();

    // Create directory structure: photos/{inspectionId}/{entryId}/
    const inspectionDir = `${PHOTOS_DIR}${inspectionId}/`;
    const entryDir = `${inspectionDir}${entryId}/`;

    try {
      // Ensure directories exist
      const inspectionDirInfo = await FileSystem.getInfoAsync(inspectionDir);
      if (!inspectionDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(inspectionDir, { intermediates: true });
      }

      const entryDirInfo = await FileSystem.getInfoAsync(entryDir);
      if (!entryDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(entryDir, { intermediates: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const extension = this.getFileExtension(uri);
      const fileName = `${timestamp}_${randomStr}.${extension}`;
      const localPath = `${entryDir}${fileName}`;

      // Copy file to local storage
      // If URI is already a local path, copy it; otherwise download it
      if (uri.startsWith('file://') || uri.startsWith(FileSystem.documentDirectory || '')) {
        // Already a local file - copy it
        await FileSystem.copyAsync({
          from: uri,
          to: localPath,
        });
      } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        // Remote URL - download it
        const downloadResult = await FileSystem.downloadAsync(uri, localPath);
        if (!downloadResult.uri) {
          throw new Error('Failed to download photo');
        }
        return downloadResult.uri;
      } else {
        // Assume it's a local path that needs to be copied
        await FileSystem.copyAsync({
          from: uri,
          to: localPath,
        });
      }

      return localPath;
    } catch (error) {
      console.error('[PhotoStorage] Failed to save photo:', error);
      throw error;
    }
  }

  /**
   * Get photo path for a photo ID
   * @param photoId - Photo ID from database
   * @returns Local file path or null if not found
   */
  async getPhotoPath(photoId: string): Promise<string | null> {
    // This should be called with the local_path from the database
    // For now, we assume the caller knows the path
    return null;
  }

  /**
   * Delete a photo from local file system
   * @param localPath - Local file path
   */
  async deletePhoto(localPath: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      }
    } catch (error) {
      console.error('[PhotoStorage] Failed to delete photo:', error);
      // Don't throw - deletion is best effort
    }
  }

  /**
   * Get file size in bytes
   * @param localPath - Local file path
   * @returns File size in bytes
   */
  async getPhotoSize(localPath: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists && 'size' in fileInfo) {
        return fileInfo.size;
      }
      return 0;
    } catch (error) {
      console.error('[PhotoStorage] Failed to get photo size:', error);
      return 0;
    }
  }

  /**
   * Clean up old photos for an inspection (after successful sync)
   * @param inspectionId - Inspection ID
   * @param keepDays - Number of days to keep photos (default: 7)
   */
  async cleanupOldPhotos(inspectionId: string, keepDays: number = 7): Promise<void> {
    try {
      const inspectionDir = `${PHOTOS_DIR}${inspectionId}/`;
      const dirInfo = await FileSystem.getInfoAsync(inspectionDir);
      
      if (!dirInfo.exists) {
        return;
      }

      const cutoffTime = Date.now() - keepDays * 24 * 60 * 60 * 1000;
      const entries = await FileSystem.readDirectoryAsync(inspectionDir);

      for (const entry of entries) {
        const entryPath = `${inspectionDir}${entry}`;
        const entryInfo = await FileSystem.getInfoAsync(entryPath);
        
        if (entryInfo.exists && entryInfo.isDirectory) {
          const photos = await FileSystem.readDirectoryAsync(entryPath);
          for (const photo of photos) {
            const photoPath = `${entryPath}/${photo}`;
            const photoInfo = await FileSystem.getInfoAsync(photoPath);
            
            if (photoInfo.exists && 'modificationTime' in photoInfo) {
              const modTime = photoInfo.modificationTime * 1000; // Convert to milliseconds
              if (modTime < cutoffTime) {
                await this.deletePhoto(photoPath);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[PhotoStorage] Failed to cleanup old photos:', error);
      // Don't throw - cleanup is best effort
    }
  }

  /**
   * Get MIME type from file extension
   * @param uri - File URI
   * @returns MIME type
   */
  getMimeType(uri: string): string {
    const extension = this.getFileExtension(uri).toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  /**
   * Extract file extension from URI
   * @param uri - File URI
   * @returns File extension (without dot)
   */
  private getFileExtension(uri: string): string {
    const parts = uri.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 1].toLowerCase();
    }
    return 'jpg'; // Default to jpg
  }

  /**
   * Get total size of all photos for an inspection
   * @param inspectionId - Inspection ID
   * @returns Total size in bytes
   */
  async getInspectionPhotosSize(inspectionId: string): Promise<number> {
    try {
      const inspectionDir = `${PHOTOS_DIR}${inspectionId}/`;
      const dirInfo = await FileSystem.getInfoAsync(inspectionDir);
      
      if (!dirInfo.exists) {
        return 0;
      }

      let totalSize = 0;
      const entries = await FileSystem.readDirectoryAsync(inspectionDir);

      for (const entry of entries) {
        const entryPath = `${inspectionDir}${entry}`;
        const entryInfo = await FileSystem.getInfoAsync(entryPath);
        
        if (entryInfo.exists && entryInfo.isDirectory) {
          const photos = await FileSystem.readDirectoryAsync(entryPath);
          for (const photo of photos) {
            const photoPath = `${entryPath}/${photo}`;
            const size = await this.getPhotoSize(photoPath);
            totalSize += size;
          }
        }
      }

      return totalSize;
    } catch (error) {
      console.error('[PhotoStorage] Failed to get inspection photos size:', error);
      return 0;
    }
  }
}

export const photoStorage = new PhotoStorage();

