import React, { FC, createContext, useContext } from 'react';
import { ComponentWithChildren, OtpRecord } from '../types';

import { Database, Q } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import migrations from '../models/migrations';
import schema from '../models/schema';
import Site, { SITE_TABLE_NAME } from '../models/Site';
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'totp',
  onSetUpError: (error: Error) => {
    // Database failed to load -- offer the user to reload the app or log out
  },
});

// Then, make a Watermelon database from it!
const db = new Database({
  adapter,
  modelClasses: [Site],
});

export interface DBContextInterface {
  db: Database;
  newSite: (site: OtpRecord) => Promise<Site>;
  listSites: () => Promise<Site[]>;
}

const newSite = (otpData: OtpRecord) =>
  db.write(async () => {
    const existing = await db.collections
      .get<Site>(SITE_TABLE_NAME)
      .query(Q.where('label', otpData.label))
      .fetch();
    if (existing.length) return existing[0];

    const site = await db.get<Site>(SITE_TABLE_NAME).create(site => {
      site.label = otpData.label;
      site.secret = otpData.secret;
      site.algorithm = otpData.algorithm;
      site.digits = otpData.digits;
      site.issuer = otpData.issuer;
      site.type = otpData.type;
      site.period = otpData.period;
    });
    return site;
  });

const listSites = () =>
  db.collections.get<Site>(SITE_TABLE_NAME).query().fetch();

const initialDBContext: DBContextInterface = {
  db,
  newSite,
  listSites,
};

export const DBContext = createContext<DBContextInterface>(initialDBContext);
export const useDB = () => useContext(DBContext);

const DatabaseProvider: FC<ComponentWithChildren> = ({ children }) => {
  return (
    <DBContext.Provider value={initialDBContext}>{children}</DBContext.Provider>
  );
};

export default DatabaseProvider;
