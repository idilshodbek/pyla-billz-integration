require('dotenv').config();
import { sendMessageToGroup } from "../utils/telegrambot.utils";
import axios from "axios";
import CardsModel from "../models/cards.models";
import { BadRequestException } from "../exceptions/HttpExceptions";
import OrdersModel from "../models/orders.models";
import integrationsModel from "../models/integrations.models";
import CryptoUtils from "../utils/crypto.utils";
import { billzAuth } from "../utils/billz-auth.utils";
import { logger } from "../utils/logger.utils";
import { Section, Action } from "../models/logs.models";
import ClientModel from "../models/clients.models";
import UserModel from "../models/users.models";
import mongoose from "mongoose";

export interface BillzClientData {
    first_name: string;
    phone_number: string;
}

export interface BillzOrderData {
    method: string;
    params: {
        shop_id: string;
    };
}

export interface BillzAddItemData {
    product_id: string;
    sold_measurement_value: number;
    use_free_price: boolean;
    is_manual: boolean;
    response_type: string;
    seller_ids?: string[];
}

export interface BillzAddClientData {
    method: string;
    params: {
        customer_id: string;
        order_id: string;
    };
}

export interface BillzPostponeData {
    method: string;
    params: {
        order_id: string;
        comment?: string;
        time?: string;
    };
}

export interface BillzDiscountData {
    discount_unit: string;
    discount_value: number;
}

export interface BillzPaymentData {
    method: string;
    params: {
        payments: Array<{
            id: string;
            company_payment_type_id: string;
            paid_amount: number;
        }>;
        order_id: string;
    };
}

export interface PlaceOrderData {
    _id: string;
    isPostPonement: boolean;
    isPaid: boolean;
    deliveryStatus: string;
    storeId: string;
    storeExternalID: string;
    paymentMethod: string;
    regionId: mongoose.Types.ObjectId;
    paidAmount: number;
    deliveryAddress: {
        street: string;
        city: string;
        apartment: string;
        floor: string | null;
        entrance: string | null;
    };
    coordinates: {
        latitude: number;
        longitude: number;
        accuracy: number;
    };
    products: Array<{
        productID?: string;
        ID?: string;
        qty: number;
        name: any;
        sku: string;
        barCode: string;
        imageUrl: string;
        subTotalPrice: number;
        totalPrice: number;
        discountAmount: number;
    }>;
    subTotalPrice: number;
    discountAmount: number;
    totalPrice: number;
    deliverySubTotalPrice: number;
    clientIdSys: string;
    createdBy: mongoose.Types.ObjectId;
    region: string;
    store: string;
    orderID: number;
    employeeName: string;
    userId?: mongoose.Types.ObjectId;
}

class Billz {
    public cardsModel = CardsModel;
    private billzIntegration: any = null;

    constructor() {
        // Integration data will be loaded dynamically
    }

    /**
     * Get Billz integration configuration
     */
    private async getBillzIntegration() {
        if (!this.billzIntegration) {
            this.billzIntegration = await integrationsModel.findOne({
                type: 'billz',
                isActive: true
            });
            if (!this.billzIntegration) {
                await this.logError('getBillzIntegration', 'Billz integration not found or not active', {
                    method: 'getBillzIntegration',
                    searchCriteria: { type: 'billz', isActive: true },
                    timestamp: new Date().toISOString()
                });
                return null;
            }
        }
        return this.billzIntegration;
    }

    /**
     * Get decrypted shop ID
     */
    private async getShopId(): Promise<string | null> {
        const integration = await this.getBillzIntegration();
        if (!integration?.shop_id) {
            await this.logError('getShopId', 'Billz shop_id not configured', {
                method: 'getShopId',
                integrationId: integration?._id,
                hasIntegration: !!integration,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        try {
            if (typeof integration.shop_id === 'string' && integration.shop_id.startsWith('{')) {
                // Encrypted shop_id
                const encryptedData = JSON.parse(integration.shop_id);
                return CryptoUtils.decrypt(encryptedData);
            } else {
                // Plain text shop_id (for backward compatibility)
                return integration.shop_id;
            }
        } catch (error: any) {
            await this.logError('getShopId', 'Error decrypting shop_id', {
                method: 'getShopId',
                integrationId: integration._id,
                shop_id: integration.shop_id,
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    /**
     * Get authentication headers
     */
    private async getAuthHeaders() {
        try {
            return await billzAuth.getAuthHeaders();
        } catch (error: any) {
            await this.logError('getAuthHeaders', 'Error getting authentication headers', {
                method: 'getAuthHeaders',
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    /**
     * Log error with comprehensive data
     */
    private async logError(operation: string, message: string, additionalData: Record<string, any>) {
        try {
            await logger.logError({
                section: Section.ERRORS,
                action: Action.CREATE,
                description: {
                    operation,
                    service: 'Billz',
                    errorMessage: message,
                    ...additionalData
                }
            }, message);
        } catch (logError: any) {
            console.error('Failed to log error:', logError.message);
        }
    }

    public async createClient(clientPhone: string, clientFirstName: string, clientLastName: string) {
        const data: BillzClientData = {
            first_name: clientFirstName,
            phone_number: clientPhone
        };

        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('createClient', 'Failed to get authentication headers', {
                method: 'createClient',
                clientPhone,
                clientFirstName,
                clientLastName,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        try {
            const createBillzClient = await axios.post('https://api-admin.billz.ai/v1/client', data, {
                headers: {
                    ...headers,
                    'accept': 'application/json'
                }
            });

            return createBillzClient;
        } catch (error: any) {
            await this.logError('createClient', 'Error creating Billz client', {
                method: 'createClient',
                clientPhone,
                clientFirstName,
                clientLastName,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: 'https://api-admin.billz.ai/v1/client',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async createOrder() {
        const shopId = await this.getShopId();
        const headers = await this.getAuthHeaders();
        if (!shopId || !headers) {
            await this.logError('createOrder', 'Failed to get shop ID or authentication headers', {
                method: 'createOrder',
                hasShopId: !!shopId,
                hasHeaders: !!headers,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        const data: BillzOrderData = {
            method: "order.create",
            params: {
                shop_id: shopId
            }
        };

        try {
            const createBillzOrder = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers
            });

            return createBillzOrder;
        } catch (error: any) {
            await this.logError('createOrder', 'Error creating Billz order', {
                method: 'createOrder',
                shopId,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: 'https://api-admin.billz.ai/v1/orders',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async addItem(product_id: string, qty: number, order_id: string, employeeID?: string) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('addItem', 'Failed to get authentication headers', {
                method: 'addItem',
                product_id,
                qty,
                order_id,
                employeeID,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        const data: BillzAddItemData = {
            "product_id": product_id,
            "sold_measurement_value": qty,
            "use_free_price": true,
            "is_manual": true,
            "response_type": "HTTP"
        };

        // Push employee ID if exists
        if (employeeID && employeeID !== "") {
            data.seller_ids = [];
            data.seller_ids.push(employeeID);
        }

        try {
            const addBillzProduct = await axios.post(`https://api-admin.billz.ai/v2/order-product/${order_id}`, data, {
                headers
            });
            return addBillzProduct;
        } catch (error: any) {
            await OrdersModel.deleteOne({ billzId: order_id });
            await this.logError('addItem', 'Error adding item to Billz order', {
                method: 'addItem',
                product_id,
                qty,
                order_id,
                employeeID,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: `https://api-admin.billz.ai/v2/order-product/${order_id}`,
                orderDeletedFromDB: true,
                russianMessage: "Недостаточное количество товаров в Billz",
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async addClient(customer_id: string, order_id: string) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('addClient', 'Failed to get authentication headers', {
                method: 'addClient',
                customer_id,
                order_id,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        const data: BillzAddClientData = {
            method: "order.add_customer",
            "params": {
                "customer_id": customer_id,
                "order_id": order_id,
            }
        };

        try {
            const addBillzClient = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers
            });
            return addBillzClient;
        } catch (error: any) {
            await this.logError('addClient', 'Error adding client to Billz order', {
                method: 'addClient',
                customer_id,
                order_id,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: 'https://api-admin.billz.ai/v1/orders',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async postponeOrder(order_id: string, comment: string = "") {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('postponeOrder', 'Failed to get authentication headers', {
                method: 'postponeOrder',
                order_id,
                comment,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        const data: BillzPostponeData = {
            method: "order.postpone",
            "params": {
                "order_id": order_id,
                "comment": comment,
                "time": await this.addDaysToCurrentDate(30)
            }
        };

        try {
            const createBillzOrder = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers
            });
            return createBillzOrder;
        } catch (error: any) {
            await this.logError('postponeOrder', 'Error postponing Billz order', {
                method: 'postponeOrder',
                order_id,
                comment,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: 'https://api-admin.billz.ai/v1/orders',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async cancelPostponeOrder(order_id: string) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('cancelPostponeOrder', 'Failed to get authentication headers', {
                method: 'cancelPostponeOrder',
                order_id,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        const data: BillzPostponeData = {
            method: "order.postpone",
            "params": {
                "order_id": order_id,
            }
        };

        try {
            const cancelOrder = await axios.post('https://api-admin.billz.ai/v2/order/return-postpone', data, {
                headers
            });

            return cancelOrder;
        } catch (error: any) {
            await this.logError('cancelPostponeOrder', 'Error canceling postponed Billz order', {
                method: 'cancelPostponeOrder',
                order_id,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: 'https://api-admin.billz.ai/v2/order/return-postpone',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async createDiscount(order_id: string, amount: number, subTotalPrice: number) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('createDiscount', 'Failed to get authentication headers', {
                method: 'createDiscount',
                order_id,
                amount,
                subTotalPrice,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        const data: BillzDiscountData = {
            "discount_unit": "CURRENCY",
            "discount_value": (subTotalPrice - amount)
        };

        try {
            const addBillzProduct = await axios.post(`https://api-admin.billz.ai/v2/order-manual-discount/${order_id}`, data, {
                headers
            });

            return addBillzProduct;
        } catch (error: any) {
            await this.logError('createDiscount', 'Error creating Billz discount', {
                method: 'createDiscount',
                order_id,
                amount,
                subTotalPrice,
                discountValue: subTotalPrice - amount,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: `https://api-admin.billz.ai/v2/order-manual-discount/${order_id}`,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async makePayment(order_id: string, card_id: string, totalPrice: number) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('makePayment', 'Failed to get authentication headers', {
                method: 'makePayment',
                order_id,
                card_id,
                totalPrice,
                timestamp: new Date().toISOString()
            });
            return null;
        }
        const data: BillzPaymentData = {
            method: "order.make_payment",
            "params": {
                "payments": [
                    {
                        "id": card_id,
                        "company_payment_type_id": card_id,
                        "paid_amount": totalPrice
                    }
                ],
                "order_id": order_id
            }
        };
        try {
            const getSingleSaleInfo = await axios.get(`https://api-admin.billz.ai/v2/order/${order_id}`, {
                headers
            });

            if (getSingleSaleInfo.data.park_status === "completed") {
                console.log("Заказ уже оплачен", order_id);
                return getSingleSaleInfo;
            }

            const paymentResponse = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers
            });

            return paymentResponse;
        } catch (error: any) {
            await this.logError('makePayment', 'Error making payment in Billz', {
                method: 'makePayment',
                order_id,
                card_id,
                totalPrice,
                requestData: data,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                getOrderUrl: `https://api-admin.billz.ai/v2/order/${order_id}`,
                paymentUrl: 'https://api-admin.billz.ai/v1/orders',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async deletePostponeOrder(order_id: string) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('deletePostponeOrder', 'Failed to get authentication headers', {
                method: 'deletePostponeOrder',
                order_id,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        try {
            const deleteOrder = await axios.delete(`https://api-admin.billz.ai/v2/order/${order_id}`, {
                headers
            });

            return deleteOrder;
        } catch (error: any) {
            await this.logError('deletePostponeOrder', 'Error deleting postponed Billz order', {
                method: 'deletePostponeOrder',
                order_id,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: `https://api-admin.billz.ai/v2/order/${order_id}`,
                httpMethod: 'DELETE',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    public async addDaysToCurrentDate(days: number): Promise<string> {
        const currentDate = new Date(); // Get the current date and time
        const newDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000); // Add days in milliseconds

        // Format the date to 'YYYY-MM-DD HH:mm:ss'
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(newDate.getDate()).padStart(2, '0');
        const hours = String(newDate.getHours()).padStart(2, '0');
        const minutes = String(newDate.getMinutes()).padStart(2, '0');
        const seconds = String(newDate.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * Place a complete order in Billz system
     */
    public async placeOrder(orderData: PlaceOrderData): Promise<any> {
        const correlationId = `order_${orderData.orderID}_${Date.now()}`;
        try {
            // Log the start of order placement
            await logger.logSuccess({
                section: Section.BILLZ,
                action: Action.CREATE,
                description: {
                    operation: 'placeOrder_start',
                    orderID: orderData.orderID,
                    clientIdSys: orderData.clientIdSys,
                    totalPrice: orderData.totalPrice,
                    productsCount: orderData.products.length,
                    correlationId
                }
            });

            // Step 1: Create order in Billz
            const billzOrderResponse = await this.createOrder();
            if (!billzOrderResponse) {
                await this.logError('placeOrder', 'Failed to create Billz order', {
                    step: 'createOrder',
                    orderData,
                    correlationId,
                    timestamp: new Date().toISOString()
                });
                return null;
            }
            const billzOrderId = billzOrderResponse.data?.result;
            if (!billzOrderId) {
                await this.logError('placeOrder', 'No order ID returned from Billz', {
                    step: 'createOrder',
                    billzResponse: billzOrderResponse.data,
                    orderData,
                    correlationId,
                    timestamp: new Date().toISOString()
                });
                return null;
            }
            // Log successful order creation
            await logger.logSuccess({
                section: Section.BILLZ,
                action: Action.CREATE,
                description: {
                    operation: 'billz_order_created',
                    billzOrderId,
                    orderID: orderData.orderID,
                    correlationId
                }
            });

            // Add billzId field to order in db
            await OrdersModel.findByIdAndUpdate(orderData._id, { billzId: billzOrderId });

            // Step 3: Handle client - check if client exists and has billzId
            let client = await ClientModel.findById(orderData.clientIdSys);
            let billzClientId = null;

            if (!client) {
                await this.logError('placeOrder', 'Client not found in database', {
                    step: 'clientLookup',
                    clientIdSys: orderData.clientIdSys,
                    billzOrderId,
                    correlationId,
                    timestamp: new Date().toISOString()
                });
                return null;
            }
            if (!client.billzId) {
                // Create client in Billz
                const billzClientResponse = await this.createClient(
                    client.phone.toString(),
                    client.firstName,
                    client.lastName || ''
                );

                if (!billzClientResponse) {
                    await this.logError('placeOrder', 'Failed to create client in Billz', {
                        step: 'createClient',
                        clientData: {
                            phone: client.phone,
                            firstName: client.firstName,
                            lastName: client.lastName
                        },
                        billzOrderId,
                        correlationId,
                        timestamp: new Date().toISOString()
                    });
                    return null;
                }
                billzClientId = billzClientResponse.data?.id;
                if (!billzClientId) {
                    await this.logError('placeOrder', 'No client ID returned from Billz', {
                        step: 'createClient',
                        billzResponse: billzClientResponse.data,
                        clientData: client,
                        billzOrderId,
                        correlationId,
                        timestamp: new Date().toISOString()
                    });
                    return null;
                }

                // Update client with billzId
                await ClientModel.findByIdAndUpdate(orderData.clientIdSys, { billzId: billzClientId });

                // Log successful client creation
                await logger.logSuccess({
                    section: Section.BILLZ,
                    action: Action.CREATE,
                    description: {
                        operation: 'billz_client_created',
                        billzClientId,
                        clientId: orderData.clientIdSys,
                        phone: client.phone,
                        correlationId
                    }
                });
            } else {
                billzClientId = client.billzId;

                // Log client already exists
                await logger.logSuccess({
                    section: Section.BILLZ,
                    action: Action.CREATE,
                    description: {
                        operation: 'billz_client_exists',
                        billzClientId,
                        clientId: orderData.clientIdSys,
                        correlationId
                    }
                });
            }
            // Step 4: Add client to order
            const addClientResponse = await this.addClient(billzClientId, billzOrderId);
            if (!addClientResponse) {
                await this.logError('placeOrder', 'Failed to add client to Billz order', {
                    step: 'addClient',
                    billzClientId,
                    billzOrderId,
                    correlationId,
                    timestamp: new Date().toISOString()
                });
                return null;
            }
            // Log successful client addition
            await logger.logSuccess({
                section: Section.BILLZ,
                action: Action.CREATE,
                description: {
                    operation: 'billz_client_added_to_order',
                    billzClientId,
                    billzOrderId,
                    correlationId
                }
            });
            // Step 5: Get user's externalID for addItem calls
            let userExternalID: string | undefined;
            if (orderData.createdBy) {
                try {
                    const createdByUser = await UserModel.findById(orderData.createdBy).select('externalID');
                    userExternalID = createdByUser?.externalID || undefined;
                } catch (error) {
                    await this.logError('placeOrder', 'Failed to fetch createdBy user externalID', {
                        step: 'fetchUserExternalID',
                        createdBy: orderData.createdBy,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        correlationId,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            // Step 6: Add all products to the order
            const addedProducts = [];
            for (const product of orderData.products) {
                // check if ID field exists if not exists just skip
                if (!product.ID) {
                    continue;
                }
                const addItemResponse = await this.addItem(
                    product.ID,
                    product.qty,
                    billzOrderId,
                    userExternalID
                );
                if (!addItemResponse) {
                    await this.logError('placeOrder', 'Failed to add product to Billz order', {
                        step: 'addItem',
                        productID: product.productID,
                        qty: product.qty,
                        sku: product.sku,
                        billzOrderId,
                        correlationId,
                        timestamp: new Date().toISOString()
                    });
                    return null;
                }
                addedProducts.push({
                    productID: product.productID,
                    sku: product.sku,
                    qty: product.qty,
                    billzResponse: addItemResponse.data
                });

                // Log successful product addition
                await logger.logSuccess({
                    section: Section.BILLZ,
                    action: Action.CREATE,
                    description: {
                        operation: 'billz_product_added',
                        productID: product.productID,
                        sku: product.sku,
                        qty: product.qty,
                        billzOrderId,
                        correlationId
                    }
                });
            }
            // Step 7: Final success log
            await logger.logSuccess({
                section: Section.BILLZ,
                action: Action.CREATE,
                description: {
                    operation: 'placeOrder_completed',
                    billzOrderId,
                    orderID: orderData.orderID,
                    clientIdSys: orderData.clientIdSys,
                    billzClientId,
                    totalPrice: orderData.totalPrice,
                    productsCount: orderData.products.length,
                    addedProducts,
                    correlationId,
                    completedAt: new Date().toISOString()
                }
            });
            // Step 8: Create discount if exists
            if (orderData.discountAmount > 0) {
                const discountResponse = await this.createDiscount(billzOrderId, orderData.discountAmount, orderData.subTotalPrice);
                if (!discountResponse) {
                    await this.logError('placeOrder', 'Failed to create discount in Billz', {
                        step: 'createDiscount',
                        billzOrderId
                    });
                    return null;
                }
            }

            // Step 9: Postpone the order
            const postponeResponse = await this.postponeOrder(billzOrderId, `Order ${orderData.orderID} - ${orderData.region}`);
            if (!postponeResponse) {
                await this.logError('placeOrder', 'Failed to postpone Billz order', {
                    step: 'postponeOrder',
                    billzOrderId,
                    orderData,
                    correlationId,
                    timestamp: new Date().toISOString()
                });
                return null;
            }
            // Log successful postponement
            await logger.logSuccess({
                section: Section.BILLZ,
                action: Action.CREATE,
                description: {
                    operation: 'billz_order_postponed',
                    billzOrderId,
                    orderID: orderData.orderID,
                    correlationId
                }
            });

            return {
                success: true,
                billzOrderId,
                billzClientId,
                addedProducts,
                correlationId
            };

        } catch (error: any) {
            await this.logError('placeOrder', 'Unexpected error during order placement', {
                operation: 'placeOrder',
                orderData,
                errorMessage: error.message,
                errorStack: error.stack,
                correlationId,
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }

    /**
     * Get order details from Billz
     */
    public async getOrder(order_id: string) {
        const headers = await this.getAuthHeaders();
        if (!headers) {
            await this.logError('getOrder', 'Failed to get authentication headers', {
                method: 'getOrder',
                order_id,
                timestamp: new Date().toISOString()
            });
            return null;
        }

        try {
            const response = await axios.get(`https://api-admin.billz.ai/v2/order/${order_id}`, {
                headers
            });

            return response;
        } catch (error: any) {
            await this.logError('getOrder', 'Error getting Billz order details', {
                method: 'getOrder',
                order_id,
                errorMessage: error.message,
                errorResponse: error.response?.data,
                errorStatus: error.response?.status,
                errorStack: error.stack,
                url: `https://api-admin.billz.ai/v2/order/${order_id}`,
                httpMethod: 'GET',
                timestamp: new Date().toISOString()
            });
            return null;
        }
    }
}

export default Billz;
