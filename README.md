# Spare Parts Zone

A comprehensive business management system for spare parts businesses, featuring inventory management, billing, accounting, and staff management.

## Features

### 🏢 Business Management
- **Role-based Authentication**: Admin and Staff roles with different permissions
- **JWT Security**: Secure authentication with refresh tokens
- **Staff Management**: Admin approval required for staff accounts

### 📦 Inventory Management
- **Product CRUD**: Create, read, update, delete products
- **Stock Tracking**: Real-time stock monitoring with activity logs
- **Low Stock Alerts**: Automatic alerts for reorder levels
- **Product Categories**: Organize products by brand and category
- **Archive Products**: Soft delete functionality

### 👥 Customer Management
- **Customer Profiles**: Complete customer information management
- **Credit Management**: Set credit limits and payment terms
- **Billing System**: Generate sales invoices automatically
- **Due Tracking**: Monitor customer outstanding dues
- **Loyalty System**: Track customer spending and visits

### 🏭 Supplier Management
- **Supplier Profiles**: Complete supplier information
- **Purchase Orders**: Create purchase invoices from suppliers
- **Performance Rating**: Rate suppliers on reliability, quality, delivery
- **Payable Tracking**: Monitor supplier payment obligations
- **Top Suppliers**: Identify best-performing suppliers

### 💰 Financial Management
- **Unified Ledger**: All financial transactions in one place
- **Multi-Account Support**: Cash, bank, mobile money accounts
- **Transaction Types**: Sales, purchases, payments, adjustments
- **Financial Reports**: Profit/loss, cash flow, balance sheets
- **Export Functionality**: CSV exports for accounting

### 📊 Dashboard & Analytics
- **Real-time Overview**: Live business statistics
- **Sales Analytics**: Track sales trends and performance
- **Inventory Reports**: Stock levels, low stock alerts
- **Financial Summary**: Income, expenses, profit margins
- **Top Performers**: Best products, customers, suppliers

### 👨‍💼 Staff Management (Admin Only)
- **Staff Approval**: Approve new staff registrations
- **Activity Tracking**: Monitor staff performance metrics
- **Salary Management**: Base salary, bonuses, payment history
- **Performance Reports**: Sales and activity summaries
- **Access Control**: Admin-only functionalities

### 📄 Invoice System
- **PDF Generation**: Automatic PDF invoice creation
- **Multi-Product Invoices**: Add multiple products per invoice
- **Payment Tracking**: Partial and full payment support
- **Due Management**: Automatic due date calculations
- **Invoice Status**: Draft, sent, paid, partially paid, overdue

## Technology Stack

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **MongoDB**: Database with Mongoose ODM
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing
- **Puppeteer**: PDF generation

### Frontend
- **React.js**: UI framework
- **TailwindCSS**: Styling
- **React Router**: Navigation
- **React Query**: Data fetching
- **Lucide React**: Icons

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- npm or yarn

### Backend Setup
```bash
cd server
npm install
```

### Frontend Setup
```bash
cd client
npm install
```

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/SparePartzone

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

# Business Info
BUSINESS_NAME=Spare Parts Zone
BUSINESS_ADDRESS=Your Business Address
BUSINESS_PHONE=Your Phone Number
BUSINESS_EMAIL=your@email.com
```

## Running the Application

### Development Mode

1. Start the backend server:
```bash
cd server
npm run dev
```

2. Start the frontend development server:
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Mode

1. Build the frontend:
```bash
cd client
npm run build
```

2. Start the backend server:
```bash
cd server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get products with pagination
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `POST /api/products/:id/stock` - Update product stock
- `DELETE /api/products/:id` - Delete product

### Customers
- `GET /api/customers` - Get customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `POST /api/customers/:id/invoices` - Create sales invoice

### Suppliers
- `GET /api/suppliers` - Get suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier details
- `PUT /api/suppliers/:id` - Update supplier
- `POST /api/suppliers/:id/purchases` - Create purchase invoice

### Invoices
- `GET /api/invoices/sales` - Get sales invoices
- `GET /api/invoices/purchases` - Get purchase invoices
- `GET /api/invoices/overdue` - Get overdue invoices
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Transactions
- `GET /api/transactions` - Get transactions
- `POST /api/transactions` - Create manual transaction
- `GET /api/transactions/summary` - Get financial summary
- `GET /api/transactions/export/csv` - Export transactions

### Dashboard
- `GET /api/dashboard/overview` - Get dashboard overview
- `GET /api/dashboard/sales-chart` - Get sales chart data
- `GET /api/dashboard/top-products` - Get top products
- `GET /api/dashboard/inventory-status` - Get inventory status

### Users (Admin Only)
- `GET /api/users` - Get users
- `POST /api/users/:id/approve` - Approve staff account
- `PUT /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

## Database Schema

### Users
- Authentication and authorization
- Role-based access control
- Staff activity tracking
- Salary management

### Products
- Product information and pricing
- Stock management with logs
- Supplier relationships
- Category and brand organization

### Customers
- Customer profiles and contact info
- Credit limits and payment terms
- Purchase history and dues
- Loyalty tracking

### Suppliers
- Supplier profiles and ratings
- Purchase history
- Performance tracking
- Payment obligations

### Invoices
- Sales and purchase invoices
- Multiple product support
- Payment tracking
- Status management

### Transactions
- Unified financial ledger
- Account balance tracking
- Transaction categorization
- Audit trail

## Default Admin Account

After installation, the first user registered with role "admin" will automatically be:
- Active and approved
- Able to manage all aspects of the system
- Can approve staff accounts

## Features Overview

### Real-World Business Logic
- Automatic stock updates on sales/purchases
- Real-time financial calculations
- Interconnected customer/supplier accounting
- Audit-friendly immutable transaction logs

### Security Features
- JWT-based authentication
- Role-based permissions
- Password hashing
- Rate limiting
- Input validation

### Scalability
- Modular architecture
- Clean separation of concerns
- RESTful API design
- Optimized database queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.

---

**Spare Parts Zone** - Your complete business management solution for spare parts retailing.