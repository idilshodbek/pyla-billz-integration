import LogModel, { Section, Action, ILog } from '../models/logs.models';
import { telegramBot } from './telegrambot.utils';
import { LogData, BillzLogData } from '../interfaces';
import mongoose from 'mongoose';

export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log a successful operation
   */
  public async logSuccess(data: LogData): Promise<ILog | null> {
    try {
      const logEntry = new LogModel({
        section: data.section,
        action: data.action,
        userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
        createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : undefined,
        orderId: data.orderId ? new mongoose.Types.ObjectId(data.orderId) : undefined,
        productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
        driverId: data.driverId ? new mongoose.Types.ObjectId(data.driverId) : undefined,
        description: data.description,
        success: true,
        correlationId: data.correlationId,
      });

      const savedLog = await logEntry.save();
      console.log(`✅ Success logged: ${data.section}.${data.action}`);
      return savedLog;
    } catch (error: any) {
      console.error('Failed to log success:', error.message);
      return null;
    }
  }

  /**
   * Log a failed operation
   */
  public async logError(data: LogData, errorMessage: string): Promise<ILog | null> {
    try {
      const logEntry = new LogModel({
        section: data.section,
        action: data.action,
        userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
        createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : undefined,
        orderId: data.orderId ? new mongoose.Types.ObjectId(data.orderId) : undefined,
        productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
        driverId: data.driverId ? new mongoose.Types.ObjectId(data.driverId) : undefined,
        description: data.description,
        success: false,
        correlationId: data.correlationId,
        errorMessage: errorMessage,
      });

      const savedLog = await logEntry.save();
      console.log(`❌ Error logged: ${data.section}.${data.action} - ${errorMessage}`);
      return savedLog;
    } catch (error: any) {
      console.error('Failed to log error:', error.message);
      return null;
    }
  }

  /**
   * Log Billz operation success with Telegram notification
   */
  public async logBillzSuccess(data: BillzLogData): Promise<void> {
    try {
      // Log to MongoDB
      await this.logSuccess({
        section: Section.BILLZ,
        action: data.action,
        orderId: data.orderId,
        description: data.description,
        correlationId: data.correlationId,
      });

      // Send Telegram notification for important operations
      if (this.shouldNotifyTelegram(data.action)) {
        await telegramBot.sendOrderNotification({
          orderNumber: data.orderId || 'N/A',
          totalPrice: data.description.totalPrice || 0,
          customerName: data.description.customerName || 'N/A',
          status: `Billz ${data.action} Success`,
          billzId: data.description.billzId || data.orderId,
        });
      }
    } catch (error: any) {
      console.error('Failed to log Billz success:', error.message);
    }
  }

  /**
   * Log Billz operation error with Telegram notification
   */
  public async logBillzError(data: BillzLogData, error: Error): Promise<void> {
    try {
      // Log to MongoDB
      await this.logError({
        section: Section.BILLZ,
        action: data.action,
        orderId: data.orderId,
        description: data.description,
        correlationId: data.correlationId,
      }, error.message);

      // Send Telegram error notification
      await telegramBot.sendErrorNotification({
        type: `Billz ${data.action}`,
        message: error.message,
        orderId: data.orderId,
        timestamp: new Date(),
      });
    } catch (logError: any) {
      console.error('Failed to log Billz error:', logError.message);
    }
  }

  /**
   * Determine if action should trigger Telegram notification
   */
  private shouldNotifyTelegram(action: Action): boolean {
    const notifyActions = [
      Action.CREATE, // For payments, orders, clients
      Action.UPDATE, // For important updates
      Action.DELETE  // For deletions
    ];
    return notifyActions.includes(action);
  }

  /**
   * Get logs by section and action
   */
  public async getLogs(
    section?: Section, 
    action?: Action, 
    limit: number = 100,
    skip: number = 0
  ): Promise<ILog[]> {
    try {
      const query: any = {};
      if (section) query.section = section;
      if (action) query.action = action;

      const logs = await LogModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec();

      return logs;
    } catch (error: any) {
      console.error('Failed to get logs:', error.message);
      return [];
    }
  }

  /**
   * Get logs by correlation ID
   */
  public async getLogsByCorrelationId(correlationId: string): Promise<ILog[]> {
    try {
      const logs = await LogModel
        .find({ correlationId })
        .sort({ createdAt: -1 })
        .exec();

      return logs;
    } catch (error: any) {
      console.error('Failed to get logs by correlation ID:', error.message);
      return [];
    }
  }

  /**
   * Get error logs only
   */
  public async getErrorLogs(limit: number = 50): Promise<ILog[]> {
    try {
      const logs = await LogModel
        .find({ success: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();

      return logs;
    } catch (error: any) {
      console.error('Failed to get error logs:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
