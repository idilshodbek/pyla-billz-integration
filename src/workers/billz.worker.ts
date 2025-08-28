require('dotenv').config();
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import Billz from '../services/billz.service';
import { telegramBot } from '../utils/telegrambot.utils';
import { logger } from '../utils/logger.utils';
import { Action } from '../models/logs.models';
import {
  BillzJobData,
  CreateClientJobData,
  CreateOrderJobData,
  AddItemJobData,
  AddClientJobData,
  PostponeOrderJobData,
  CreateDiscountJobData,
  MakePaymentJobData,
  DeleteOrderJobData,
  GetOrderJobData,
  PlaceOrderJobData
} from '../interfaces';

export class BillzWorker {
  private worker: Worker | null = null;
  private billzService: Billz;
  private static instance: BillzWorker;

  private constructor() {
    this.billzService = new Billz();
  }

  public static getInstance(): BillzWorker {
    if (!BillzWorker.instance) {
      BillzWorker.instance = new BillzWorker();
    }
    return BillzWorker.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const redis = await redisConnection.connect();

      this.worker = new Worker(
        'billz-operations',
        this.processJob.bind(this),
        {
          connection: redis,
          concurrency: 5, // Maximum number of jobs that can be processed simultaneously by this worker
          removeOnComplete: { count: 100 },  // Keep last 100 for monitoring
          removeOnFail: { count: 200 },      // Keep more failed jobs for debugging        }
        }
      );

      this.worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed successfully`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} failed:`, err.message);
        this.handleJobFailure(job, err);
      });

      this.worker.on('error', (err) => {
        console.error('Worker error:', err);
      });

      console.log('Billz worker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Billz worker:', error);
      throw error;
    }
  }

  private async processJob(job: Job<BillzJobData>): Promise<void> {
    const { type, payload, correlationId } = job.data;

    console.log(`Processing job ${job.id} of type ${type} with correlation ID ${correlationId}`);

    try {
      switch (type) {
        case 'CREATE_CLIENT':
          await this.handleCreateClient(payload as CreateClientJobData, correlationId);
          break;

        case 'CREATE_ORDER':
          await this.handleCreateOrder(payload as CreateOrderJobData, correlationId);
          break;

        case 'ADD_ITEM':
          await this.handleAddItem(payload as AddItemJobData, correlationId);
          break;

        case 'ADD_CLIENT':
          await this.handleAddClient(payload as AddClientJobData, correlationId);
          break;

        case 'POSTPONE_ORDER':
          await this.handlePostponeOrder(payload as PostponeOrderJobData, correlationId);
          break;

        case 'CANCEL_POSTPONE':
          await this.handleCancelPostpone(payload as { orderId: string }, correlationId);
          break;

        case 'CREATE_DISCOUNT':
          await this.handleCreateDiscount(payload as CreateDiscountJobData, correlationId);
          break;

        case 'MAKE_PAYMENT':
          await this.handleMakePayment(payload as MakePaymentJobData, correlationId);
          break;

        case 'DELETE_ORDER':
          await this.handleDeleteOrder(payload as DeleteOrderJobData, correlationId);
          break;

        case 'GET_ORDER':
          await this.handleGetOrder(payload as GetOrderJobData, correlationId);
          break;

        case 'PLACE_ORDER':
          await this.handlePlaceOrder(payload as PlaceOrderJobData, correlationId);
          break;

        default:
          throw new Error(`Unknown job type: ${type}`);
      }

    } catch (error: any) {
      // Log error with MongoDB and Telegram notification
      await logger.logBillzError({
        action: this.getActionFromType(type),
        orderId: payload?.orderId || payload?.order_id,
        description: { jobType: type, payload },
        correlationId,
      }, error);

      throw error;
    }
  }

  private async handleCreateClient(data: CreateClientJobData, correlationId?: string): Promise<void> {
    const { clientPhone, clientFirstName, clientLastName } = data;
    await this.billzService.createClient(clientPhone, clientFirstName, clientLastName);

    await logger.logBillzSuccess({
      action: Action.CREATE,
      description: {
        clientPhone,
        clientFirstName,
        clientLastName,
        operation: 'create_client'
      },
      correlationId,
    });
  }

  private async handleCreateOrder(data: CreateOrderJobData, correlationId?: string): Promise<void> {
    await this.billzService.createOrder();

    await logger.logBillzSuccess({
      action: Action.CREATE,
      description: {
        shopId: data.shopId,
        operation: 'create_order'
      },
      correlationId,
    });
  }

  private async handleAddItem(data: AddItemJobData, correlationId?: string): Promise<void> {
    const { productId, qty, orderId, employeeID } = data;
    await this.billzService.addItem(productId, qty, orderId, employeeID);

    await logger.logBillzSuccess({
      action: Action.CREATE,
      orderId,
      description: {
        productId,
        qty,
        employeeID,
        operation: 'add_item'
      },
      correlationId,
    });
  }

  private async handleAddClient(data: AddClientJobData, correlationId?: string): Promise<void> {
    const { customerId, orderId } = data;
    await this.billzService.addClient(customerId, orderId);

    await logger.logBillzSuccess({
      action: Action.UPDATE,
      orderId,
      description: {
        customerId,
        operation: 'add_client_to_order'
      },
      correlationId,
    });
  }

  private async handlePostponeOrder(data: PostponeOrderJobData, correlationId?: string): Promise<void> {
    const { orderId, comment } = data;
    await this.billzService.postponeOrder(orderId, comment);

    await logger.logBillzSuccess({
      action: Action.UPDATE,
      orderId,
      description: {
        comment,
        operation: 'postpone_order'
      },
      correlationId,
    });
  }

  private async handleCancelPostpone(data: { orderId: string }, correlationId?: string): Promise<void> {
    const { orderId } = data;
    await this.billzService.cancelPostponeOrder(orderId);

    await logger.logBillzSuccess({
      action: Action.UPDATE,
      orderId,
      description: {
        operation: 'cancel_postpone_order'
      },
      correlationId,
    });
  }

  private async handleCreateDiscount(data: CreateDiscountJobData, correlationId?: string): Promise<void> {
    const { orderId, amount, totalPrice } = data;
    await this.billzService.createDiscount(orderId, amount, totalPrice);

    await logger.logBillzSuccess({
      action: Action.CREATE,
      orderId,
      description: {
        amount,
        totalPrice,
        discountAmount: totalPrice - amount,
        operation: 'create_discount'
      },
      correlationId,
    });
  }

  private async handleMakePayment(data: MakePaymentJobData, correlationId?: string): Promise<void> {
    const { orderId, cardId, totalPrice } = data;
    await this.billzService.makePayment(orderId, cardId, totalPrice);

    await logger.logBillzSuccess({
      action: Action.CREATE,
      orderId,
      description: {
        cardId,
        totalPrice,
        operation: 'make_payment'
      },
      correlationId,
    });
  }

  private async handleDeleteOrder(data: DeleteOrderJobData, correlationId?: string): Promise<void> {
    const { orderId } = data;
    await this.billzService.deletePostponeOrder(orderId);

    await logger.logBillzSuccess({
      action: Action.DELETE,
      orderId,
      description: {
        operation: 'delete_order'
      },
      correlationId,
    });
  }

  private async handleGetOrder(data: GetOrderJobData, correlationId?: string): Promise<void> {
    console.log('==========================1')
    const { orderId } = data;
    await this.billzService.getOrder(orderId);

    await logger.logBillzSuccess({
      action: Action.GET,
      orderId,
      description: {
        operation: 'get_order'
      },
      correlationId,
    });
  }

  private async handlePlaceOrder(data: PlaceOrderJobData, correlationId?: string): Promise<void> {
    // Convert the job data to the format expected by the placeOrder method
    const orderData = {
      ...data,
      regionId: data.regionId as any, // Convert string back to ObjectId if needed
      createdBy: data.createdBy as any, // Convert string back to ObjectId if needed
      userId: data.userId ? data.userId as any : undefined,
    };

    await this.billzService.placeOrder(orderData);

    await logger.logBillzSuccess({
      action: Action.CREATE,
      orderId: data.orderID.toString(),
      description: {
        operation: 'place_order',
        orderID: data.orderID,
        clientIdSys: data.clientIdSys,
        totalPrice: data.totalPrice,
        productsCount: data.products.length,
        storeId: data.storeId,
        region: data.region
      },
      correlationId,
    });
  }

  /**
   * Map job types to actions for logging
   */
  private getActionFromType(type: string): Action {
    switch (type) {
      case 'CREATE_CLIENT':
      case 'CREATE_ORDER':
      case 'ADD_ITEM':
      case 'CREATE_DISCOUNT':
      case 'MAKE_PAYMENT':
      case 'PLACE_ORDER':
        return Action.CREATE;

      case 'ADD_CLIENT':
      case 'POSTPONE_ORDER':
      case 'CANCEL_POSTPONE':
        return Action.UPDATE;

      case 'DELETE_ORDER':
        return Action.DELETE;

      case 'GET_ORDER':
        return Action.GET;

      default:
        return Action.CREATE;
    }
  }

  private async handleJobFailure(job: Job | undefined, error: Error): Promise<void> {
    if (!job) return;

    const { type, payload, correlationId } = job.data;

    console.error(`Job ${job.id} failed after ${job.attemptsMade} attempts:`, {
      type,
      correlationId,
      error: error.message,
      payload,
    });

    // If this was the final attempt, we might want to store it for manual review
    if (job.attemptsMade >= 3) {
      console.error(`Job ${job.id} exceeded maximum retries. Manual intervention may be required.`);
    }
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      console.log('Billz worker closed');
    }
  }

  public getWorker(): Worker | null {
    return this.worker;
  }
}

export const billzWorker = BillzWorker.getInstance();
