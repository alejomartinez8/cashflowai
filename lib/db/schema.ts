import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('Nueva conversación'),
  messages: jsonb('messages').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
