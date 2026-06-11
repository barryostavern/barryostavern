import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/db';
import { User } from '../models';

async function seedAdmin(): Promise<void> {
  const auth0Sub = process.env.ADMIN_AUTH0_SUB;
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME;

  if (!auth0Sub || !email || !name) {
    console.error(
      'Missing required env vars: ADMIN_AUTH0_SUB, ADMIN_EMAIL, and ADMIN_NAME must be set in server/.env'
    );
    process.exit(1);
  }

  await connectDatabase();

  const user = await User.findOneAndUpdate(
    { auth0Sub },
    { auth0Sub, email, name, role: 'manager' },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin user upserted: ${user.email} (${user.role})`);

  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error('seedAdmin failed:', error);
  process.exit(1);
});
