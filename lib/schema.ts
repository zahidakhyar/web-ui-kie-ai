import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: text("task_id").notNull().unique(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  params: text("params").notNull(), // JSON string of full input params
  status: text("status", { enum: ["pending", "waiting", "success", "fail"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
  errorMsg: text("error_msg"),
});

export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.taskId),
  r2Url: text("r2_url").notNull(),
  originalUrl: text("original_url").notNull(),
  width: real("width"),
  height: real("height"),
  createdAt: integer("created_at").notNull(),
});

export const uploads = sqliteTable("uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  r2Url: text("r2_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  createdAt: integer("created_at").notNull(),
});
