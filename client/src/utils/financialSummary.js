export const getFinancialSummary = (transactions = []) => {
  if (!Array.isArray(transactions)) {
    return {
      totalSales: 0,
      totalPurchases: 0,
      incomeTotal: 0,
      expenseTotal: 0,
      cashBalance: 0,
      receivables: 0
    };
  }

  const sales = transactions.filter(t => t.type === 'sale');
  const purchases = transactions.filter(t => t.type === 'purchase');
  const income = transactions.filter(t => t.category === 'income');
  const expenses = transactions.filter(t => t.category === 'expense');
  const cashTransactions = transactions.filter(t => t.account === 'cash' && t.category === 'income');
  const unpaidSales = transactions.filter(t => t.type === 'sale' && t.due > 0);

  const totalSales = sales.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPurchases = purchases.reduce((sum, t) => sum + (t.amount || 0), 0);
  const incomeTotal = income.reduce((sum, t) => sum + (t.amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const cashBalance = cashTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const receivables = unpaidSales.reduce((sum, t) => sum + (t.due || 0), 0);

  return {
    totalSales,
    totalPurchases,
    incomeTotal,
    expenseTotal,
    cashBalance,
    receivables,
    netBalance: incomeTotal - expenseTotal,
    salesCount: sales.length,
    purchaseCount: purchases.length,
    transactionCount: transactions.length
  };
};

export const calculateCustomerDues = (invoices = [], customerName) => {
  if (!Array.isArray(invoices) || !customerName) return 0;
  
  return invoices
    .filter(invoice => invoice.customer?.name === customerName)
    .reduce((sum, invoice) => sum + (invoice.amountDue || Math.max(0, (invoice.total || 0) - (invoice.amountPaid || invoice.paid || 0))), 0);
};

export const calculateSupplierPayables = (invoices = [], supplierName) => {
  if (!Array.isArray(invoices) || !supplierName) return 0;
  
  return invoices
    .filter(invoice => invoice.supplier?.name === supplierName)
    .reduce((sum, invoice) => sum + (invoice.amountDue || Math.max(0, (invoice.total || 0) - (invoice.amountPaid || invoice.paid || 0))), 0);
};

export const getAccountBalances = (transactions = []) => {
  if (!Array.isArray(transactions)) return [];
  
  const accounts = {};
  
  transactions.forEach(transaction => {
    const account = transaction.account || 'unknown';
    if (!accounts[account]) {
      accounts[account] = { income: 0, expense: 0 };
    }
    
    if (transaction.category === 'income') {
      accounts[account].income += transaction.amount || 0;
    } else if (transaction.category === 'expense') {
      accounts[account].expense += transaction.amount || 0;
    }
  });
  
  return Object.entries(accounts).map(([account, balances]) => ({
    account,
    balance: balances.income - balances.expense
  }));
};

export const getLowStockProducts = (products = []) => {
  if (!Array.isArray(products)) return 0;
  
  return products.filter(product => {
    const currentStock = product.stock?.current || product.stock || 0;
    const threshold = product.stock?.reorderThreshold || product.reorderThreshold || 10;
    return currentStock <= threshold;
  }).length;
};

export const calculatePaymentStatus = (invoice) => {
  const total = invoice.total || 0;
  const paid = invoice.amountPaid || invoice.paid || 0;
  const due = invoice.amountDue || Math.max(0, total - paid);
  
  if (due <= 0) return 'fully_paid';
  if (paid > 0 && due > 0) return 'partially_paid';
  return 'unpaid';
};