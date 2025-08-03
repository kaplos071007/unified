import { PrismaClient } from '../src/generated/prisma'
import { hash } from 'bcryptjs'
import { DEFAULT_ROLES, ROLE_PERMISSIONS, ROLE_DESCRIPTIONS } from '../src/constants/roles'
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '../src/constants/permissions'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create permissions
  console.log('📝 Creating permissions...')
  const permissionRecords = await Promise.all(
    Object.entries(ALL_PERMISSIONS).map(async ([key, value]) => {
      const module = value.split('.')[0]
      const description = key.replace(/_/g, ' ').toLowerCase()
      
      return prisma.permission.upsert({
        where: { name: value },
        update: {},
        create: {
          name: value,
          description: `Permission to ${description}`,
          module,
        }
      })
    })
  )
  console.log(`✅ Created ${permissionRecords.length} permissions`)

  // Create roles
  console.log('👥 Creating roles...')
  const roleRecords = await Promise.all(
    Object.entries(DEFAULT_ROLES).map(async ([key, value]) => {
      return prisma.role.upsert({
        where: { name: value },
        update: {},
        create: {
          name: value,
          description: ROLE_DESCRIPTIONS[value as keyof typeof ROLE_DESCRIPTIONS],
        }
      })
    })
  )
  console.log(`✅ Created ${roleRecords.length} roles`)

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...')
  for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) continue

    for (const permissionName of permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: permissionName } })
      if (!permission) continue

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        }
      })
    }
  }
  console.log('✅ Assigned permissions to roles')

  // Create default branches
  console.log('🏢 Creating default branches...')
  const branches = [
    {
      name: 'Head Office',
      code: 'HO',
      address: '123 Main Street, City Center, State 12345',
    },
    {
      name: 'Branch A',
      code: 'BRA',
      address: '456 Oak Avenue, Downtown, State 12346',
    },
    {
      name: 'Branch B',
      code: 'BRB',
      address: '789 Pine Street, Uptown, State 12347',
    }
  ]

  const branchRecords = await Promise.all(
    branches.map(async (branch) => {
      return prisma.branch.upsert({
        where: { code: branch.code },
        update: {},
        create: branch
      })
    })
  )
  console.log(`✅ Created ${branchRecords.length} branches`)

  // Create super admin user
  console.log('👤 Creating super admin user...')
  const superAdminRole = await prisma.role.findUnique({ where: { name: DEFAULT_ROLES.SUPER_ADMIN } })
  const headOffice = await prisma.branch.findUnique({ where: { code: 'HO' } })

  if (superAdminRole && headOffice) {
    const hashedPassword = await hash('admin123', 12)
    
    const superAdmin = await prisma.user.upsert({
      where: { email: 'admin@enterprise.com' },
      update: {},
      create: {
        email: 'admin@enterprise.com',
        passwordHash: hashedPassword,
        fullName: 'System Administrator',
        phone: '+1234567890',
        isActive: true,
      }
    })

    // Assign super admin to head office
    await prisma.userBranchRole.upsert({
      where: {
        userId_branchId_roleId: {
          userId: superAdmin.id,
          branchId: headOffice.id,
          roleId: superAdminRole.id,
        }
      },
      update: {},
      create: {
        userId: superAdmin.id,
        branchId: headOffice.id,
        roleId: superAdminRole.id,
      }
    })

    console.log('✅ Created super admin user (admin@enterprise.com / admin123)')
  }

  // Create sample users for different roles
  console.log('👥 Creating sample users...')
  const sampleUsers = [
    {
      email: 'hr.manager@enterprise.com',
      fullName: 'HR Manager',
      phone: '+1234567891',
      roleName: DEFAULT_ROLES.HR_MANAGER,
      branchCode: 'HO',
    },
    {
      email: 'finance.manager@enterprise.com',
      fullName: 'Finance Manager',
      phone: '+1234567892',
      roleName: DEFAULT_ROLES.FINANCE_MANAGER,
      branchCode: 'HO',
    },
    {
      email: 'procurement.manager@enterprise.com',
      fullName: 'Procurement Manager',
      phone: '+1234567893',
      roleName: DEFAULT_ROLES.PROCUREMENT_MANAGER,
      branchCode: 'BRA',
    },
    {
      email: 'inventory.manager@enterprise.com',
      fullName: 'Inventory Manager',
      phone: '+1234567894',
      roleName: DEFAULT_ROLES.INVENTORY_MANAGER,
      branchCode: 'BRA',
    },
    {
      email: 'employee@enterprise.com',
      fullName: 'John Employee',
      phone: '+1234567895',
      roleName: DEFAULT_ROLES.EMPLOYEE,
      branchCode: 'BRB',
    }
  ]

  for (const userData of sampleUsers) {
    const hashedPassword = await hash('password123', 12)
    const role = await prisma.role.findUnique({ where: { name: userData.roleName } })
    const branch = await prisma.branch.findUnique({ where: { code: userData.branchCode } })

    if (role && branch) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          passwordHash: hashedPassword,
          fullName: userData.fullName,
          phone: userData.phone,
          isActive: true,
        }
      })

      await prisma.userBranchRole.upsert({
        where: {
          userId_branchId_roleId: {
            userId: user.id,
            branchId: branch.id,
            roleId: role.id,
          }
        },
        update: {},
        create: {
          userId: user.id,
          branchId: branch.id,
          roleId: role.id,
        }
      })
    }
  }
  console.log(`✅ Created ${sampleUsers.length} sample users`)

  // Create default settings
  console.log('⚙️ Creating default settings...')
  const defaultSettings = [
    { key: 'app.name', value: 'Enterprise Admin System', type: 'STRING', group: 'app', label: 'Application Name' },
    { key: 'app.version', value: '1.0.0', type: 'STRING', group: 'app', label: 'Application Version' },
    { key: 'auth.session_timeout', value: '1440', type: 'NUMBER', group: 'auth', label: 'Session Timeout (minutes)' },
    { key: 'auth.max_login_attempts', value: '5', type: 'NUMBER', group: 'auth', label: 'Max Login Attempts' },
    { key: 'payroll.default_currency', value: 'USD', type: 'STRING', group: 'payroll', label: 'Default Currency' },
    { key: 'procurement.auto_approve_limit', value: '1000', type: 'NUMBER', group: 'procurement', label: 'Auto Approve Limit' },
    { key: 'inventory.low_stock_threshold', value: '10', type: 'NUMBER', group: 'inventory', label: 'Low Stock Threshold' },
    { key: 'notifications.email_enabled', value: 'true', type: 'BOOLEAN', group: 'notifications', label: 'Email Notifications Enabled' },
    { key: 'backup.auto_backup', value: 'true', type: 'BOOLEAN', group: 'backup', label: 'Auto Backup Enabled' },
  ]

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type as any,
        group: setting.group,
        label: setting.label,
        description: `Default setting for ${setting.label.toLowerCase()}`,
      }
    })
  }
  console.log(`✅ Created ${defaultSettings.length} default settings`)

  // Create feature toggles
  console.log('🎛️ Creating feature toggles...')
  const featureToggles = [
    { name: 'payroll.enabled', module: 'payroll', enabled: true, description: 'Enable payroll module' },
    { name: 'inventory.enabled', module: 'inventory', enabled: true, description: 'Enable inventory module' },
    { name: 'procurement.enabled', module: 'procurement', enabled: true, description: 'Enable procurement module' },
    { name: 'accounting.enabled', module: 'accounting', enabled: true, description: 'Enable accounting module' },
    { name: 'workflows.enabled', module: 'workflows', enabled: true, description: 'Enable workflow engine' },
    { name: 'notifications.enabled', module: 'notifications', enabled: true, description: 'Enable notification system' },
    { name: 'reporting.enabled', module: 'reporting', enabled: true, description: 'Enable reporting module' },
    { name: 'otp.enabled', module: 'auth', enabled: false, description: 'Enable OTP verification' },
    { name: 'backup.enabled', module: 'system', enabled: true, description: 'Enable backup system' },
  ]

  for (const toggle of featureToggles) {
    await prisma.featureToggle.upsert({
      where: { name: toggle.name },
      update: {},
      create: toggle
    })
  }
  console.log(`✅ Created ${featureToggles.length} feature toggles`)

  // Create sample chart of accounts
  console.log('📊 Creating chart of accounts...')
  const accounts = [
    // Assets
    { code: '1000', name: 'Current Assets', type: 'ASSET', parentCode: null },
    { code: '1100', name: 'Cash and Cash Equivalents', type: 'ASSET', parentCode: '1000' },
    { code: '1200', name: 'Accounts Receivable', type: 'ASSET', parentCode: '1000' },
    { code: '1300', name: 'Inventory', type: 'ASSET', parentCode: '1000' },
    { code: '1400', name: 'Prepaid Expenses', type: 'ASSET', parentCode: '1000' },
    
    // Liabilities
    { code: '2000', name: 'Current Liabilities', type: 'LIABILITY', parentCode: null },
    { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', parentCode: '2000' },
    { code: '2200', name: 'Accrued Expenses', type: 'LIABILITY', parentCode: '2000' },
    { code: '2300', name: 'Payroll Liabilities', type: 'LIABILITY', parentCode: '2000' },
    
    // Equity
    { code: '3000', name: 'Owner\'s Equity', type: 'EQUITY', parentCode: null },
    { code: '3100', name: 'Retained Earnings', type: 'EQUITY', parentCode: '3000' },
    
    // Revenue
    { code: '4000', name: 'Revenue', type: 'REVENUE', parentCode: null },
    { code: '4100', name: 'Sales Revenue', type: 'REVENUE', parentCode: '4000' },
    
    // Expenses
    { code: '5000', name: 'Operating Expenses', type: 'EXPENSE', parentCode: null },
    { code: '5100', name: 'Salaries and Wages', type: 'EXPENSE', parentCode: '5000' },
    { code: '5200', name: 'Office Supplies', type: 'EXPENSE', parentCode: '5000' },
    { code: '5300', name: 'Utilities', type: 'EXPENSE', parentCode: '5000' },
  ]

  const accountMap = new Map<string, string>()

  for (const account of accounts) {
    const parent = account.parentCode ? accountMap.get(account.parentCode) : null
    
    const createdAccount = await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: {
        code: account.code,
        name: account.name,
        type: account.type as any,
        parentId: parent,
        isActive: true,
      }
    })
    
    accountMap.set(account.code, createdAccount.id)
  }
  console.log(`✅ Created ${accounts.length} chart of accounts`)

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('Super Admin: admin@enterprise.com / admin123')
  console.log('HR Manager: hr.manager@enterprise.com / password123')
  console.log('Finance Manager: finance.manager@enterprise.com / password123')
  console.log('Procurement Manager: procurement.manager@enterprise.com / password123')
  console.log('Inventory Manager: inventory.manager@enterprise.com / password123')
  console.log('Employee: employee@enterprise.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })