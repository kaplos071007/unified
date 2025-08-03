# 🚀 Enterprise Admin System

A comprehensive, secure, and scalable enterprise administration system built with Next.js 14, featuring modular support for RBAC, procurement, inventory, payroll, accounting, workflows, and more.

## ✨ Features

### 🔐 Authentication & Authorization
- **Multi-context RBAC**: Users can have different roles across branches
- **Session Context Selection**: Choose branch and role for each session
- **Secure Authentication**: NextAuth.js with Argon2 password hashing
- **Optional OTP**: SMS/Email verification support
- **Permission-based Access Control**: Granular permissions system

### 🏢 Core Modules
- **👥 User Management**: Admin-created users with branch/role assignments
- **🛒 Procurement**: Complete PR → PO → Receipt → Invoice workflow
- **📦 Inventory**: Stock tracking, categories, and movement history
- **💰 Payroll**: Pay grades, salary components, and payslip generation
- **📊 Accounting**: Double-entry bookkeeping with chart of accounts
- **🔄 Workflows**: Configurable approval processes
- **🔔 Notifications**: Multi-channel alerts (in-app, email, SMS)
- **📈 Reporting**: Analytics and exportable reports
- **📁 Document Management**: File uploads and organization
- **⚙️ Settings**: Global configuration and feature toggles

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ (App Router, Server Components, Server Actions)
- **Styling**: TailwindCSS + ShadCN UI
- **Backend**: Node.js with NextAuth.js
- **Database**: PostgreSQL + Prisma ORM
- **Validation**: Zod
- **Authentication**: NextAuth.js + Argon2
- **Queue**: BullMQ (Redis-based)
- **Storage**: AWS S3 + CloudFront
- **Monitoring**: Winston logging
- **Testing**: Vitest/Jest ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Redis (optional, for queues)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd enterprise-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and other configurations
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed the database with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Use the demo credentials provided in the seeding output

## 👤 Demo Credentials

After running the seed script, you can use these credentials:

- **Super Admin**: `admin@enterprise.com` / `admin123`
- **HR Manager**: `hr.manager@enterprise.com` / `password123`
- **Finance Manager**: `finance.manager@enterprise.com` / `password123`
- **Procurement Manager**: `procurement.manager@enterprise.com` / `password123`
- **Inventory Manager**: `inventory.manager@enterprise.com` / `password123`
- **Employee**: `employee@enterprise.com` / `password123`

## 📁 Project Structure

```
enterprise-admin/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Main dashboard
│   │   └── [modules]/         # Feature modules
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── form/              # Form components
│   │   ├── layout/            # Layout components
│   │   └── charts/            # Chart components
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── db.ts              # Prisma client
│   │   ├── env.ts             # Environment validation
│   │   └── utils.ts           # Common utilities
│   ├── constants/             # Application constants
│   │   ├── permissions.ts     # Permission definitions
│   │   └── roles.ts           # Role definitions
│   ├── types/                 # TypeScript type definitions
│   ├── hooks/                 # React hooks
│   └── validators/            # Zod validation schemas
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeding
│   └── migrations/            # Database migrations
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## 🔐 Security Features

- **Password Security**: Argon2 hashing with configurable rounds
- **Session Management**: JWT-based with configurable expiration
- **RBAC**: Role-based access control with granular permissions
- **Branch Isolation**: Data scoped by branch context
- **Audit Logging**: All actions logged with user, IP, and metadata
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/enterprise_admin"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Features
FEATURE_PAYROLL_ENABLED=true
FEATURE_INVENTORY_ENABLED=true
FEATURE_PROCUREMENT_ENABLED=true
# ... more feature flags
```

### Database Scripts

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:reset       # Reset database
npm run db:seed        # Seed with initial data
npm run db:studio      # Open Prisma Studio
```

## 🎯 Module Overview

### Procurement Module
Complete purchase request to payment workflow:
- Purchase Request creation and approval
- Purchase Order generation
- Goods Receipt processing
- Invoice matching and payment

### Inventory Module
Comprehensive stock management:
- Item catalog with categories
- Multi-branch stock tracking
- Stock movements (IN/OUT/ADJUSTMENT)
- Low stock alerts

### Payroll Module
Employee compensation management:
- Pay grade structures
- Custom salary components
- Payroll period processing
- Payslip generation (PDF)

### Accounting Module
Double-entry bookkeeping system:
- Chart of Accounts
- Journal Entries
- Trial Balance
- Financial Statements

## 🔀 Workflow Engine

Configurable approval workflows for:
- Purchase Request approvals
- Payroll processing
- Document approvals
- Custom business processes

## 📊 Reporting & Analytics

- Real-time dashboards
- Exportable reports (CSV, XLSX, PDF)
- Custom filters and date ranges
- Branch-specific reporting
- Audit trail reports

## 🔔 Notification System

Multi-channel notifications:
- In-app notifications
- Email alerts
- SMS notifications (Twilio/AWS SNS)
- User preference management

## 🧪 Testing

```bash
npm run test           # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Support

```dockerfile
# Dockerfile included for containerized deployment
docker build -t enterprise-admin .
docker run -p 3000:3000 enterprise-admin
```

### Environment Setup

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations and seeding
4. Set up Redis for queues (optional)
5. Configure AWS S3 for file storage (optional)

## 📚 API Documentation

API routes follow RESTful conventions:

```
/api/auth/*           # Authentication
/api/users/*          # User management
/api/procurement/*    # Procurement operations
/api/inventory/*      # Inventory management
/api/payroll/*        # Payroll operations
/api/accounting/*     # Accounting operations
/api/notifications/*  # Notification system
/api/reports/*        # Reporting
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the code comments
- Open an issue on GitHub

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Advanced workflow designer
- [ ] Integration with external systems
- [ ] Real-time collaboration features

---

Built with ❤️ using Next.js, Prisma, and modern web technologies.
