import { db } from './index.ts';
import { missions } from './schema.ts';
import { eq, asc } from 'drizzle-orm';
import { getOrCreateUser } from './users.ts';

export async function getUserMissions(uid: string) {
  const user = await getOrCreateUser(uid, '');
  if (!user) return [];
  
  return await db.select()
    .from(missions)
    .where(eq(missions.userId, user.id))
    .orderBy(asc(missions.level), asc(missions.id));
}

export async function createMissions(uid: string, newMissions: any[]) {
  const user = await getOrCreateUser(uid, '');
  if (!user || newMissions.length === 0) return [];

  const values = newMissions.map((m, index) => ({
    userId: user.id,
    title: m.title,
    description: m.description,
    type: m.type,
    level: m.level || (index + 1), // default ordering if none provided
    status: 'PENDING'
  }));

  return await db.insert(missions).values(values).returning();
}

export async function addCustomMission(uid: string, mission: { title: string; description: string; type: string; level?: number }) {
  const user = await getOrCreateUser(uid, '');
  if (!user) return null;

  const result = await db.insert(missions).values({
    userId: user.id,
    title: mission.title,
    description: mission.description,
    type: mission.type,
    level: mission.level || 99, // Custom missions default to highest level or append
    status: 'PENDING'
  }).returning();

  return result[0];
}

export async function updateMissionStatus(id: number, status: string) {
  const result = await db.update(missions)
    .set({ status })
    .where(eq(missions.id, id))
    .returning();
  
  return result[0];
}
