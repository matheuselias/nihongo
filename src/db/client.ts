import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { SqliteProgressRepository } from './sqlite-progress-repository';

export const db = drizzle(openDatabaseSync('nihongo.db'));
export const progressRepository = new SqliteProgressRepository(db);
