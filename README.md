# Billz Integration Microservice

A pure queue-based Node.js microservice for integrating with Billz.ai API. This service **only accepts and processes jobs** from the main microservice via BullMQ, performs Billz API operations, and sends notifications via Telegram bot. It operates without HTTP endpoints and only listens to message queues.

## Features

- **Job Consumer Only**: Accepts and processes jobs from main microservice via BullMQ
- **Billz.ai Integration**: Complete API integration for order management  
- **Database Models**: MongoDB with Mongoose for Orders and Cards
- **Telegram Notifications**: Real-time notifications for order events and errors
- **TypeScript**: Full TypeScript support with proper typing
- **Error Handling**: Comprehensive error handling with custom exceptions
- **Redis Integration**: Redis for queue management and job processing

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Redis
- Billz.ai API credentials
- Telegram Bot Token (optional, for notifications)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd billzpyla
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/billz_microservice

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Billz API
BILLZ_TOKEN=your_billz_token_here
BILLZ_SHOP_ID=your_shop_id_here

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_GROUP_ID=your_group_id_here

# App
PORT=3000
NODE_ENV=development
```

5. Build the application:
```bash
npm run build
```

## Usage

### Starting the Microservice

Start the queue-based microservice:
```bash
npm start
```

Or for development:
```bash
npm run dev
```

### How It Works

This microservice **only receives and processes jobs** from the main microservice. The main microservice adds jobs to the `billz-operations` queue, and this service processes them.

**Job Flow:**
1. Main microservice adds job to `billz-operations` queue
2. This microservice picks up the job  
3. Processes the Billz API operation
4. Sends success/error notifications via Telegram
5. Updates local database if needed

## Queue Operations

This service listens to the `billz-operations` queue and processes incoming jobs from the main microservice.

### Available Job Types

- `CREATE_CLIENT` - Create a new client in Billz
- `CREATE_ORDER` - Create a new order  
- `ADD_ITEM` - Add item to an order
- `ADD_CLIENT` - Add client to an order
- `POSTPONE_ORDER` - Postpone an order
- `CANCEL_POSTPONE` - Cancel order postponement
- `CREATE_DISCOUNT` - Create discount for an order
- `MAKE_PAYMENT` - Process payment
- `DELETE_ORDER` - Delete an order
- `GET_ORDER` - Get order details
- `PLACE_ORDER` - Place a complete order (comprehensive operation)

### Example Job Payloads (sent by main microservice)

```typescript
// CREATE_CLIENT job
{
  type: 'CREATE_CLIENT',
  payload: {
    clientPhone: '+1234567890',
    clientFirstName: 'John',
    clientLastName: 'Doe'
  },
  correlationId: 'unique_id_123',
  timestamp: 1234567890
}

// ADD_ITEM job
{
  type: 'ADD_ITEM', 
  payload: {
    productId: 'product123',
    qty: 2,
    orderId: 'order123',
    employeeID: 'emp123' // optional
  },
  correlationId: 'unique_id_124',
  timestamp: 1234567891
}

// MAKE_PAYMENT job
{
  type: 'MAKE_PAYMENT',
  payload: {
    orderId: 'order123',
    cardId: 'card123', 
    totalPrice: 150
  },
  correlationId: 'unique_id_125',
  timestamp: 1234567892
}

// PLACE_ORDER job (comprehensive order placement)
{
  type: 'PLACE_ORDER',
  payload: {
    isPostPonement: false,
    isPaid: false,
    deliveryStatus: 'pending',
    storeId: 'store123',
    storeExternalID: 'ext_store_123',
    paymentMethod: 'online',
    regionId: '64a7b8c9d5e6f7890abcdef1',
    paidAmount: 0,
    deliveryAddress: {
      street: 'Main Street 123',
      city: 'Tashkent',
      apartment: '5A',
      floor: '2',
      entrance: 'A'
    },
    coordinates: {
      latitude: 41.2995,
      longitude: 69.2401,
      accuracy: 10
    },
    products: [
      {
        productID: 'prod123',
        qty: 2,
        name: { en: 'Product Name', uz: 'Mahsulot nomi' },
        sku: 'SKU123',
        barCode: '1234567890123',
        imageUrl: 'https://example.com/image.jpg',
        subTotalPrice: 100,
        totalPrice: 100,
        discountAmount: 0
      }
    ],
    subTotalPrice: 100,
    discountAmount: 0,
    totalPrice: 100,
    deliverySubTotalPrice: 20,
    clientIdSys: '64a7b8c9d5e6f7890abcdef2',
    createdBy: '64a7b8c9d5e6f7890abcdef3',
    region: 'Tashkent',
    store: 'Main Store',
    orderID: 12345,
    employeeName: 'John Doe',
    userId: '64a7b8c9d5e6f7890abcdef4'
  },
  correlationId: 'unique_id_126',
  timestamp: 1234567893
}
```

## Architecture

### Queue System

The microservice uses BullMQ for queue-based processing:

- **Asynchronous Processing**: All Billz API calls are processed asynchronously
- **Retry Logic**: Failed jobs are automatically retried with exponential backoff
- **Priority Queues**: Payment operations have higher priority
- **Correlation IDs**: Each request gets a unique correlation ID for tracking

### Database Models

#### Orders Model
- Complete order information with delivery details
- Billz integration fields
- Indexed for performance

#### Cards Model
- Payment card information
- Integration with external systems

### Error Handling

- Custom HTTP exceptions
- Telegram notifications for errors
- Comprehensive logging
- Graceful error recovery

### Monitoring

- Health check endpoints
- Web dashboard for monitoring
- Request logging with correlation IDs
- Performance metrics

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | Yes |
| `REDIS_PASSWORD` | Redis password | No |
| `BILLZ_TOKEN` | Billz API token | Yes |
| `BILLZ_SHOP_ID` | Billz shop ID | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No |
| `TELEGRAM_GROUP_ID` | Telegram group ID | No |
| `PORT` | Application port | No (default: 3000) |
| `NODE_ENV` | Environment | No (default: development) |

## Deployment

### Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Considerations

1. **Process Management**: Use PM2 or similar for process management
2. **Load Balancing**: Multiple instances can run behind a load balancer
3. **Monitoring**: Set up proper monitoring and alerting
4. **Logging**: Configure structured logging for production
5. **Security**: Use proper authentication and authorization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the ISC License.
