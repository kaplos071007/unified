// Authentication & User Management
export const AUTH_PERMISSIONS = {
  MANAGE_USERS: 'auth.manage_users',
  VIEW_USERS: 'auth.view_users',
  MANAGE_ROLES: 'auth.manage_roles',
  MANAGE_PERMISSIONS: 'auth.manage_permissions',
  RESET_USER_PASSWORD: 'auth.reset_user_password',
  DEACTIVATE_USER: 'auth.deactivate_user',
} as const

// Branch Management
export const BRANCH_PERMISSIONS = {
  MANAGE_BRANCHES: 'branch.manage_branches',
  VIEW_BRANCHES: 'branch.view_branches',
  ASSIGN_USER_TO_BRANCH: 'branch.assign_user_to_branch',
} as const

// Procurement
export const PROCUREMENT_PERMISSIONS = {
  CREATE_PURCHASE_REQUEST: 'procurement.create_purchase_request',
  VIEW_PURCHASE_REQUESTS: 'procurement.view_purchase_requests',
  APPROVE_PURCHASE_REQUEST: 'procurement.approve_purchase_request',
  REJECT_PURCHASE_REQUEST: 'procurement.reject_purchase_request',
  CREATE_PURCHASE_ORDER: 'procurement.create_purchase_order',
  VIEW_PURCHASE_ORDERS: 'procurement.view_purchase_orders',
  MANAGE_VENDORS: 'procurement.manage_vendors',
  RECEIVE_GOODS: 'procurement.receive_goods',
  MANAGE_INVOICES: 'procurement.manage_invoices',
  PROCESS_PAYMENTS: 'procurement.process_payments',
} as const

// Inventory
export const INVENTORY_PERMISSIONS = {
  VIEW_INVENTORY: 'inventory.view_inventory',
  MANAGE_ITEMS: 'inventory.manage_items',
  MANAGE_CATEGORIES: 'inventory.manage_categories',
  ADJUST_STOCK: 'inventory.adjust_stock',
  VIEW_STOCK_TRANSACTIONS: 'inventory.view_stock_transactions',
  MANAGE_STOCK_LEVELS: 'inventory.manage_stock_levels',
} as const

// Payroll
export const PAYROLL_PERMISSIONS = {
  VIEW_PAYROLL: 'payroll.view_payroll',
  MANAGE_EMPLOYEES: 'payroll.manage_employees',
  MANAGE_PAY_GRADES: 'payroll.manage_pay_grades',
  CREATE_PAYROLL_PERIOD: 'payroll.create_payroll_period',
  GENERATE_PAYSLIPS: 'payroll.generate_payslips',
  APPROVE_PAYROLL: 'payroll.approve_payroll',
  VIEW_PAYSLIPS: 'payroll.view_payslips',
  DOWNLOAD_PAYSLIPS: 'payroll.download_payslips',
} as const

// Accounting
export const ACCOUNTING_PERMISSIONS = {
  VIEW_ACCOUNTS: 'accounting.view_accounts',
  MANAGE_ACCOUNTS: 'accounting.manage_accounts',
  CREATE_JOURNAL_ENTRIES: 'accounting.create_journal_entries',
  VIEW_JOURNAL_ENTRIES: 'accounting.view_journal_entries',
  APPROVE_JOURNAL_ENTRIES: 'accounting.approve_journal_entries',
  VIEW_TRIAL_BALANCE: 'accounting.view_trial_balance',
  VIEW_FINANCIAL_STATEMENTS: 'accounting.view_financial_statements',
  CLOSE_ACCOUNTING_PERIOD: 'accounting.close_accounting_period',
} as const

// Workflows
export const WORKFLOW_PERMISSIONS = {
  VIEW_WORKFLOWS: 'workflow.view_workflows',
  MANAGE_WORKFLOWS: 'workflow.manage_workflows',
  APPROVE_WORKFLOW_TASKS: 'workflow.approve_workflow_tasks',
  REJECT_WORKFLOW_TASKS: 'workflow.reject_workflow_tasks',
} as const

// Notifications
export const NOTIFICATION_PERMISSIONS = {
  VIEW_NOTIFICATIONS: 'notification.view_notifications',
  MANAGE_NOTIFICATION_PREFERENCES: 'notification.manage_notification_preferences',
  SEND_SYSTEM_NOTIFICATIONS: 'notification.send_system_notifications',
} as const

// Reporting
export const REPORTING_PERMISSIONS = {
  VIEW_REPORTS: 'reporting.view_reports',
  CREATE_REPORTS: 'reporting.create_reports',
  EXPORT_REPORTS: 'reporting.export_reports',
  VIEW_ANALYTICS: 'reporting.view_analytics',
  VIEW_AUDIT_LOGS: 'reporting.view_audit_logs',
} as const

// Documents
export const DOCUMENT_PERMISSIONS = {
  VIEW_DOCUMENTS: 'document.view_documents',
  UPLOAD_DOCUMENTS: 'document.upload_documents',
  DELETE_DOCUMENTS: 'document.delete_documents',
  MANAGE_DOCUMENT_CATEGORIES: 'document.manage_document_categories',
} as const

// Settings
export const SETTINGS_PERMISSIONS = {
  VIEW_SETTINGS: 'settings.view_settings',
  MANAGE_SETTINGS: 'settings.manage_settings',
  MANAGE_FEATURE_TOGGLES: 'settings.manage_feature_toggles',
  VIEW_SYSTEM_INFO: 'settings.view_system_info',
  MANAGE_BACKUPS: 'settings.manage_backups',
} as const

// Combine all permissions
export const ALL_PERMISSIONS = {
  ...AUTH_PERMISSIONS,
  ...BRANCH_PERMISSIONS,
  ...PROCUREMENT_PERMISSIONS,
  ...INVENTORY_PERMISSIONS,
  ...PAYROLL_PERMISSIONS,
  ...ACCOUNTING_PERMISSIONS,
  ...WORKFLOW_PERMISSIONS,
  ...NOTIFICATION_PERMISSIONS,
  ...REPORTING_PERMISSIONS,
  ...DOCUMENT_PERMISSIONS,
  ...SETTINGS_PERMISSIONS,
} as const

// Permission groups for easier management
export const PERMISSION_GROUPS = {
  AUTHENTICATION: Object.values(AUTH_PERMISSIONS),
  BRANCH_MANAGEMENT: Object.values(BRANCH_PERMISSIONS),
  PROCUREMENT: Object.values(PROCUREMENT_PERMISSIONS),
  INVENTORY: Object.values(INVENTORY_PERMISSIONS),
  PAYROLL: Object.values(PAYROLL_PERMISSIONS),
  ACCOUNTING: Object.values(ACCOUNTING_PERMISSIONS),
  WORKFLOWS: Object.values(WORKFLOW_PERMISSIONS),
  NOTIFICATIONS: Object.values(NOTIFICATION_PERMISSIONS),
  REPORTING: Object.values(REPORTING_PERMISSIONS),
  DOCUMENTS: Object.values(DOCUMENT_PERMISSIONS),
  SETTINGS: Object.values(SETTINGS_PERMISSIONS),
} as const

// Helper type for all permission values
export type Permission = typeof ALL_PERMISSIONS[keyof typeof ALL_PERMISSIONS]