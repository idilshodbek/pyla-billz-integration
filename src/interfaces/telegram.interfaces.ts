export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

export interface OrderNotificationData {
  orderNumber: string;
  totalPrice: number;
  customerName?: string;
  status: string;
  billzId?: string;
}

export interface ErrorNotificationData {
  type: string;
  message: string;
  orderId?: string;
  timestamp?: Date;
}

export interface TelegramMessageOptions {
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}
