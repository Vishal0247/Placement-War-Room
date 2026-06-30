import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
      },
    })
    .returning();

  return result[0];
}

export async function updateUserProfile(uid: string, profile: {
  name?: string;
  branch?: string;
  gradYear?: number;
  cgpa?: string;
  targetCompanies?: string;
  preferredRole?: string;
  skills?: string;
  resumeText?: string;
  readinessScore?: string;
  skillMatrix?: string;
  resumeResult?: string;
}) {
  const result = await db.update(users)
    .set(profile)
    .where(eq(users.uid, uid))
    .returning();

  return result[0];
}
