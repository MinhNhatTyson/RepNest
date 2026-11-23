import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { readBackupData } from '../db/backupRepository';
import { backupFileName, buildBackup, serializeBackup } from '../domain/backup';

export type ExportResult = 'shared' | 'unavailable';

// Writes the backup to the cache folder and opens the system share sheet
// (save to Drive, email it, send it to yourself...).
export async function exportBackup(db: SQLiteDatabase): Promise<ExportResult> {
  const { schemaVersion, data } = await readBackupData(db);
  const now = Date.now();

  const file = new File(Paths.cache, backupFileName(now));
  if (file.exists) file.delete(); // same-day re-export replaces the old file
  file.create();
  await file.write(serializeBackup(buildBackup(data, schemaVersion, now)));

  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your Repnest backup',
  });
  return 'shared';
}
