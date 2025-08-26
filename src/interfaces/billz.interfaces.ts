// Job data interfaces for Billz operations
export interface BillzJobData {
  type: 'CREATE_CLIENT' | 'CREATE_ORDER' | 'ADD_ITEM' | 'ADD_CLIENT' | 'POSTPONE_ORDER' | 
        'CANCEL_POSTPONE' | 'CREATE_DISCOUNT' | 'MAKE_PAYMENT' | 'DELETE_ORDER' | 'GET_ORDER';
  payload: any;
  correlationId?: string;
  timestamp?: number;
}

export interface CreateClientJobData {
  clientPhone: string;
  clientFirstName: string;
  clientLastName: string;
}

export interface CreateOrderJobData {
  shopId?: string;
}

export interface AddItemJobData {
  productId: string;
  qty: number;
  orderId: string;
  employeeID?: string;
}

export interface AddClientJobData {
  customerId: string;
  orderId: string;
}

export interface PostponeOrderJobData {
  orderId: string;
  comment?: string;
}

export interface CreateDiscountJobData {
  orderId: string;
  amount: number;
  totalPrice: number;
}

export interface MakePaymentJobData {
  orderId: string;
  cardId: string;
  totalPrice: number;
}

export interface DeleteOrderJobData {
  orderId: string;
}

export interface GetOrderJobData {
  orderId: string;
}
