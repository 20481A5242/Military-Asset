# Military Asset Management System

A comprehensive system for managing military assets across multiple bases with role-based access control, real-time tracking, and audit capabilities.

## Features

- **Dashboard**: Real-time metrics for opening/closing balances, net movements, assignments, and expenditures
- **Asset Tracking**: Complete lifecycle management from purchase to expenditure
- **Inter-Base Transfers**: Secure asset movement between military installations
- **Role-Based Access Control**: Admin, Base Commander, and Logistics Officer roles
- **Audit Trail**: Complete logging of all transactions for accountability
- **Responsive Design**: Works on desktop, tablet, and mobile devices

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
