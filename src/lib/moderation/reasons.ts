export type ReportTarget = "review" | "comment" | "category" | "item" | "user" | "list";
export const REPORT_TARGETS: ReportTarget[] = ["review", "comment", "category", "item", "user", "list"];
export const REPORT_REASONS = ["spam", "offensive", "false", "inappropriate", "other"] as const;
