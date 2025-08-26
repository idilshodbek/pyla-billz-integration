import axios from 'axios';
import { 
  TelegramMessage, 
  OrderNotificationData, 
  ErrorNotificationData, 
  TelegramMessageOptions 
} from '../interfaces';

export class TelegramBotUtils {
  private botToken: string;
  private groupId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.groupId = process.env.TELEGRAM_GROUP_ID || '';
  }

  /**
   * Send a message to a Telegram group
   * @param message - The message to send
   * @param chatId - Optional chat ID, defaults to configured group ID
   */
  public async sendMessageToGroup(
    message: string, 
    chatId?: string,
    options?: TelegramMessageOptions
  ): Promise<any> {
    try {
      if (!this.botToken) {
        throw new Error('Telegram bot token is not configured');
      }

      const targetChatId = chatId || this.groupId;
      if (!targetChatId) {
        throw new Error('Telegram group ID is not configured');
      }

      const telegramMessage: TelegramMessage = {
        chat_id: targetChatId,
        text: message,
        parse_mode: options?.parse_mode || 'HTML',
        disable_web_page_preview: options?.disable_web_page_preview || true
      };

      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        telegramMessage,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error sending Telegram message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a formatted order notification to the group
   */
  public async sendOrderNotification(orderData: OrderNotificationData): Promise<any> {
    const message = `
🔔 <b>Order Notification</b>

📦 Order #: <code>${orderData.orderNumber}</code>
💰 Total: <b>${orderData.totalPrice}</b>
👤 Customer: ${orderData.customerName || 'N/A'}
📊 Status: <b>${orderData.status}</b>
${orderData.billzId ? `🏪 Billz ID: <code>${orderData.billzId}</code>` : ''}

<i>Sent at ${new Date().toLocaleString()}</i>
    `.trim();

    return await this.sendMessageToGroup(message);
  }

  /**
   * Send error notification to the group
   */
  public async sendErrorNotification(error: ErrorNotificationData): Promise<any> {
    const message = `
🚨 <b>Error Alert</b>

❌ Type: <b>${error.type}</b>
💬 Message: <code>${error.message}</code>
${error.orderId ? `📦 Order ID: <code>${error.orderId}</code>` : ''}

⏰ Time: ${(error.timestamp || new Date()).toLocaleString()}
    `.trim();

    return await this.sendMessageToGroup(message);
  }
}

// Export singleton instance
export const telegramBot = new TelegramBotUtils();

// Export the main function for backward compatibility
export const sendMessageToGroup = (message: string, chatId?: string) => {
  return telegramBot.sendMessageToGroup(message, chatId);
};