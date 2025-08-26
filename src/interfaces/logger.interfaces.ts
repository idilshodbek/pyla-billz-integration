import { Section, Action } from '../models/logs.models';

export interface LogData {
  section: Section;
  action: Action;
  userId?: string;
  createdBy?: string;
  orderId?: string;
  productId?: string;
  driverId?: string;
  description: Record<string, any>;
  correlationId?: string;
}

export interface BillzLogData {
  action: Action;
  orderId?: string;
  description: Record<string, any>;
  correlationId?: string;
}
