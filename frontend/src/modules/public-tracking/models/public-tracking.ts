import type { WorkOrderStatus } from "@/shared/models/admin";

export type PublicOrderTracking = {
  orderNumber: string;
  status: WorkOrderStatus;
  progress: number;
  serviceDescription: string | null;
  serviceType: string;
  engineSummary: string;
  receivedAt: string;
  estimatedDate: string | null;
  lastUpdatedAt: string;
  timeline: PublicTrackingMilestone[];
};

export type PublicTrackingMilestone = {
  type: "ORDER_RECEIVED" | "WORK_STARTED" | "PROGRESS_UPDATED" | "WORK_COMPLETED";
  title: string;
  message: string;
  progress: number | null;
  occurredAt: string;
};

export type PublicTrackingQuery = { orderNumber: string; trackingCode: string };
