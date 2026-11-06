// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_tricky_trauma.sql';
import m0001 from './0001_far_hulk.sql';
import m0002 from './0002_review_progress.sql';
import m0003 from './0003_card_state.sql';
import m0004 from './0004_study_days.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003,
m0004
    }
  }
  