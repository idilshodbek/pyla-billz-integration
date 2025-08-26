require('dotenv').config();
import { sendMessageToGroup } from "../utils/telegrambot.utils";
import axios from "axios";
import CardsModel from "../models/cards.models";
import { BadRequestException } from "../exceptions/HttpExceptions";
import OrdersModel from "../models/orders.models";

export interface BillzClientData {
  first_name: string;
  last_name: string;
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

class Billz {
    public BILLZ_TOKEN: string;
    public BILLZ_SHOP_ID: string;
    public cardsModel = CardsModel;

    constructor() {
        this.BILLZ_TOKEN = process.env.BILLZ_TOKEN || '';
        this.BILLZ_SHOP_ID = process.env.BILLZ_SHOP_ID || '';
        
        if (!this.BILLZ_TOKEN || !this.BILLZ_SHOP_ID) {
            throw new Error('BILLZ_TOKEN and BILLZ_SHOP_ID must be provided');
        }
    }

    public async createClient(clientPhone: string, clientFirstName: string, clientLastName: string) {
        const data: BillzClientData = {
            first_name: clientFirstName,
            last_name: clientLastName,
            phone_number: clientPhone
        };

        try {
            const createBillzClient = await axios.post('https://api-admin.billz.ai/v1/client', data, {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return createBillzClient;
        } catch (error: any) {
            console.error('Error creating Billz client:', error.response?.data || error.message);
            throw error;
        }
    }

    public async createOrder() {
        const data: BillzOrderData = {
            method: "order.create",
            params: {
                shop_id: this.BILLZ_SHOP_ID
            }
        };

        try {
            const createBillzOrder = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return createBillzOrder;
        } catch (error: any) {
            console.error('Error creating Billz order:', error.response?.data || error.message);
            throw error;
        }
    }

    public async addItem(product_id: string, qty: number, order_id: string, employeeID?: string) {
        try {
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

            console.log("ADD ITEM DATA", data);

            const addBillzProduct = await axios.post(`https://api-admin.billz.ai/v2/order-product/${order_id}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return addBillzProduct;
        } catch (error: any) {
            await OrdersModel.deleteOne({ billzId: order_id });
            console.log("error.response.data", error.response?.data);
            throw new BadRequestException("Недостаточное количество товаров в Billz");
        }
    }

    public async addClient(customer_id: string, order_id: string) {
        const data: BillzAddClientData = {
            method: "order.add_customer",
            "params": {
                "customer_id": customer_id,
                "order_id": order_id,
            }
        };

        try {
            const addBillzClient = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });
            return addBillzClient;
        } catch (error: any) {
            console.error('Error adding client to Billz order:', error.response?.data || error.message);
            throw error;
        }
    }

    public async postponeOrder(order_id: string, comment: string = "") {
        const data: BillzPostponeData = {
            method: "order.postpone",
            "params": {
                "order_id": order_id,
                "comment": comment,
                "time": await this.addDaysToCurrentDate(3)
            }
        };

        console.log("POSTPONE ORDER DATA", data);

        try {
            const createBillzOrder = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });
            return createBillzOrder;
        } catch (error: any) {
            console.error('Error postponing Billz order:', error.response?.data || error.message);
            throw error;
        }
    }

    public async cancelPostponeOrder(order_id: string) {
        const data: BillzPostponeData = {
            method: "order.postpone",
            "params": {
                "order_id": order_id,
            }
        };

        try {
            const cancelOrder = await axios.post('https://api-admin.billz.ai/v2/order/return-postpone', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return cancelOrder;
        } catch (error: any) {
            console.error('Error canceling postponed Billz order:', error.response?.data || error.message);
            throw error;
        }
    }

    public async createDiscount(order_id: string, amount: number, totalPrice: number) {
        try {
            const data: BillzDiscountData = {
                "discount_unit": "CURRENCY",
                "discount_value": (totalPrice - amount)
            };
            
            const addBillzProduct = await axios.post(`https://api-admin.billz.ai/v2/order-manual-discount/${order_id}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return addBillzProduct;
        } catch (error: any) {
            console.error('Error creating Billz discount:', error.response?.data || error.message);
            throw error;
        }
    }

    public async makePayment(order_id: string, card_id: string, totalPrice: number) {
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            if (getSingleSaleInfo.data.park_status === "completed") {
                console.log("Заказ уже оплачен", order_id);
                return getSingleSaleInfo;
            }

            const paymentResponse = await axios.post('https://api-admin.billz.ai/v1/orders', data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return paymentResponse;
        } catch (error: any) {
            console.error('Make payment error:', error.response?.data || error.message);
            throw error;
        }
    }

    public async deletePostponeOrder(order_id: string) {
        try {
            const deleteOrder = await axios.delete(`https://api-admin.billz.ai/v2/order/${order_id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return deleteOrder;
        } catch (error: any) {
            console.error('Error deleting postponed Billz order:', error.response?.data || error.message);
            throw error;
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
     * Get order details from Billz
     */
    public async getOrder(order_id: string) {
        try {
            const response = await axios.get(`https://api-admin.billz.ai/v2/order/${order_id}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.BILLZ_TOKEN}`
                }
            });

            return response;
        } catch (error: any) {
            console.error('Error getting Billz order:', error.response?.data || error.message);
            throw error;
        }
    }
}

export default Billz;
