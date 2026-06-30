import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  branch: text('branch'),
  gradYear: integer('grad_year'),
  cgpa: text('cgpa'),
  targetCompanies: text('target_companies'),
  preferredRole: text('preferred_role'),
  skills: text('skills'), // Comma separated string of skills
  resumeText: text('resume_text'),
  readinessScore: text('readiness_score'), // JSON string of scores
  skillMatrix: text('skill_matrix'), // JSON string of acquired/missing skills
  resumeResult: text('resume_result'), // JSON string of ATS score and feedback
  createdAt: timestamp('created_at').defaultNow(),
});

export const missions = pgTable('missions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('PENDING'),
  type: text('type').notNull(), // 'DSA', 'OS', 'DBMS', 'RESUME', 'MOCK'
  level: integer('level').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agent_memory = pgTable('agent_memory', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  agentType: text('agent_type').notNull(), // 'STRATEGY', 'SKILL_GAP', etc.
  memoryKey: text('memory_key').notNull(),
  memoryValue: text('memory_value').notNull(), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
});

export const opportunities = pgTable('opportunities', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  description: text('description'),
  link: text('link'),
  type: text('type'), // 'INTERNSHIP', 'HACKATHON', 'PLACEMENT'
  matchScore: integer('match_score'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  missions: many(missions),
  memories: many(agent_memory),
}));

export const missionsRelations = relations(missions, ({ one }) => ({
  user: one(users, {
    fields: [missions.userId],
    references: [users.id],
  }),
}));

export const agentMemoryRelations = relations(agent_memory, ({ one }) => ({
  user: one(users, {
    fields: [agent_memory.userId],
    references: [users.id],
  }),
}));
