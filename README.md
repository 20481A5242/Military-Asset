# 🎖️ Military Asset Management System

A comprehensive, full-stack web application for tracking and managing military assets, equipment, and resources across multiple military bases. Built with modern technologies and military-grade security standards.

![Military Asset Management](https://img.shields.io/badge/Military-Asset%20Management-green)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17+-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

### 🎯 Core Functionality
- **Asset Management** - Track vehicles, weapons, ammunition, communication equipment, and other military assets
- **Multi-Base Operations** - Manage assets across multiple military installations
- **Purchase Order Management** - Record and track procurement activities with vendor information
- **Transfer System** - Move assets between bases with multi-level approval workflows
- **Assignment Tracking** - Assign assets to personnel with purpose, duration, and return tracking
- **Expenditure Management** - Track asset consumption, usage, and ammunition expenditure

### 🔐 Security & Compliance
- **Role-Based Access Control (RBAC)** - Admin, Base Commander, and Logistics Officer roles
- **Comprehensive Audit Logging** - Track all system activities for compliance and security
- **JWT Authentication** - Secure token-based authentication with configurable expiration
- **Input Validation** - Comprehensive data validation and sanitization using Joi schemas
- **Rate Limiting** - API protection against abuse and DDoS attacks
- **Security Headers** - Helmet.js for enhanced security

### 📊 Analytics & Reporting
- **Real-time Dashboard** - Live metrics, KPIs, and activity monitoring
- **Asset Distribution** - Visual representation of assets across bases
- **Transfer Analytics** - Track asset movements and approval workflows
- **Expenditure Reports** - Monitor spending and resource consumption
- **Audit Trail** - Complete transaction history for compliance

### 💻 User Experience
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Intuitive Interface** - User-friendly design tailored for military personnel
- **Fast Performance** - Optimized queries and efficient data loading
- **Progressive Web App** - Offline capability for field operations

## Technology Stack

### Frontend
- **React 18** with Vite for fast development
- **Material-UI** for consistent, professional UI components
- **React Router** for navigation
- **Axios** for API communication
- **Chart.js** for data visualization

### Backend
- **Node.js** with Express.js framework
- **Prisma ORM** for type-safe database operations
- **JWT** for authentication and authorization
- **bcrypt** for secure password hashing
- **Winston** for comprehensive logging

### Database
- **PostgreSQL** for ACID compliance and complex queries
- Optimized for asset tracking and audit requirements
- Foreign key constraints for data integrity

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd military-asset-management
```

2. Install all dependencies
```bash
npm run install:all
```

3. Set up environment variables
```bash
# Copy example environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

4. Configure database connection in `server/.env`
```env
DATABASE_URL="postgresql://username:password@localhost:5432/military_assets"
JWT_SECRET="your-super-secret-jwt-key"
```

5. Run database migrations and seed data
```bash
npm run db:migrate
npm run db:seed
```

6. Start the development servers
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Database Studio: http://localhost:5555 (run `npm run db:studio`)

## Project Structure

```
military-asset-management/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API service functions
│   │   ├── utils/         # Utility functions
│   │   └── contexts/      # React contexts
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   ├── prisma/           # Database schema and migrations
│   └── logs/             # Application logs
└── docs/                 # Documentation
```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Assets
- `GET /api/assets` - List assets with filters
- `POST /api/assets` - Create new asset
- `GET /api/assets/:id` - Get asset details
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Purchases
- `GET /api/purchases` - List purchases
- `POST /api/purchases` - Record new purchase
- `GET /api/purchases/:id` - Get purchase details

### Transfers
- `GET /api/transfers` - List transfers
- `POST /api/transfers` - Create transfer
- `PUT /api/transfers/:id/approve` - Approve transfer
- `PUT /api/transfers/:id/complete` - Complete transfer

### Assignments
- `GET /api/assignments` - List assignments
- `POST /api/assignments` - Create assignment
- `PUT /api/assignments/:id/return` - Return assigned asset

## Role-Based Access Control

### Admin
- Full system access
- User management
- All bases and assets
- System configuration

### Base Commander
- Access to assigned base only
- Asset management for their base
- Approve incoming/outgoing transfers
- Personnel assignments

### Logistics Officer
- Limited to purchases and transfers
- Cannot access sensitive assignment data
- Read-only dashboard access

## Security Features

- JWT-based authentication
- Role-based route protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Comprehensive audit logging

## Development

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests  
cd client && npm test
```

### Database Management
```bash
# Create new migration
cd server && npx prisma migrate dev --name migration_name

# Reset database
cd server && npx prisma migrate reset

# View database
npm run db:studio
```

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Ensure all production environment variables are set:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
