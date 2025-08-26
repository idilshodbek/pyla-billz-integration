import mongoose, { Document, Schema } from 'mongoose';

// Define the enums for section and action
enum Section {
    ROLES = "roles",
    ROLES_ASSIGN = "roles_assigns",
    ROLES_MENUS = "roles_menus",
    PRODUCTS = "products",
    PRODUCT_MODELS = "product-models",
    ORDERS = "orders",
    REGION = "region",
    CARDS = "cards",
    CARDS_ASSIGN = "cards_assign",
    CARDS_REGION = "cards_region",
    CATEGORY = "categories",
    DRIVERS = "drivers",
    LOGIN = "login",
    CLIENT = "clients",
    USERS = "users",
    SETTINGS = "settings",
    OFFICES = "offices",
    CASHBOX = "cashbox",
    STORES = "stores",
    DELIVERY_PRICES = "delivery_prices",
    ERRORS = "errors",
    UPLOAD_IMAGES = "upload_images",
    BANNERS = "banners",
    INTEGRATIONS = "integrations",
    SMS = "sms",
    BILLZ = "billz",
}

enum Action {
    CREATE = "create",
    UPDATE = "update",
    GET = "get",
    DELETE = "delete",
    UPLOAD_IMAGES = "upload_images",
    SEND_SMS = "send_sms"
}

// Define the interface for the document
interface ILog extends Document {
    section: Section;
    action: Action;
    userId?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    productId?: mongoose.Types.ObjectId;
    driverId?: mongoose.Types.ObjectId;
    description: Record<string, any>;
    success: boolean;
    correlationId?: string;
    errorMessage?: string;
}

// Create the schema
const LogSchema: Schema = new Schema({
    section: {
        type: String,
        enum: Object.values(Section),
        required: true
    },
    action: {
        type: String,
        enum: Object.values(Action),
        required: true
    },
    userId: {
        type: mongoose.Types.ObjectId,
        required: false
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: false // For system actions like Billz integration
    },
    orderId: {
        type: mongoose.Types.ObjectId,
        required: false
    },
    productId: {
        type: mongoose.Types.ObjectId,
        required: false
    },
    driverId: {
        type: mongoose.Types.ObjectId,
        required: false
    },
    description: {
        type: Schema.Types.Mixed, // Changed to Mixed to allow Record<string, any>
        required: true
    },
    success: {
        type: Boolean,
        required: true,
        default: true
    },
    correlationId: {
        type: String,
        required: false
    },
    errorMessage: {
        type: String,
        required: false
    }
}, { timestamps: true });

// Create indexes for better performance
LogSchema.index({ section: 1, action: 1 });
LogSchema.index({ createdAt: -1 });
LogSchema.index({ correlationId: 1 });
LogSchema.index({ success: 1 });
LogSchema.index({ orderId: 1 });

// Create the model
const LogModel = mongoose.model<ILog>('Log', LogSchema);

export { Section, Action, ILog };
export default LogModel;
