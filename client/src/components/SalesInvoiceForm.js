import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';

const SalesInvoiceForm = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    customer: '',
    isNewCustomer: false,
    customerInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
      type: 'individual'
    },
    items: [{ product: '', quantity: 1, unitPrice: 0 }],
    discount: 0,
    tax: 0,
    notes: '',
    paymentAmount: 0,
    paymentMethod: 'cash'
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const { data: customersData } = useQuery(
    'customers',
    async () => {
      const response = await api.get('/customers/list');
      return response.data;
    }
  );

  const { data: productsData } = useQuery(
    'products',
    async () => {
      const response = await api.get('/products');
      return response.data;
    }
  );

  useEffect(() => {
    if (customersData?.customers) {
      setCustomers(customersData.customers);
    }
    if (productsData?.products) {
      setProducts(productsData.products);
    }
  }, [customersData, productsData]);

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice;
      return sum + itemTotal;
    }, 0);
    const total = Math.max(0, subtotal - formData.discount + formData.tax);
    return { subtotal, total };
  };

  const { subtotal, total } = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      subtotal,
      total,
      type: 'sale'
    };

    if (formData.isNewCustomer) {
      // Remove customer field and add customerInfo for new customer
      delete submitData.customer;
      // Only include customerInfo if it has meaningful data
      if (formData.customerInfo.name || formData.customerInfo.phone) {
        submitData.customerInfo = formData.customerInfo;
      }
    } else {
      // Remove customerInfo for existing customers
      delete submitData.customerInfo;
    }


    onSubmit(submitData);
  };

  const handleCustomerSelect = (customerId) => {
    setFormData({ ...formData, customer: customerId, isNewCustomer: false });
  };

  const handleProductSelect = (productId, index) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const newItems = [...formData.items];
      newItems[index].product = productId;
      newItems[index].unitPrice = product.sellingPrice;
      setFormData({ ...formData, items: newItems });
    }
  };

  const toggleNewCustomer = () => {
    setShowNewCustomerForm(!showNewCustomerForm);
    setFormData({ ...formData, isNewCustomer: !formData.isNewCustomer });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Sales Invoice</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <div className="flex gap-2">
                {!formData.isNewCustomer && (
                  <select
                    className="input flex-1"
                    value={formData.customer}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    required={!formData.isNewCustomer}
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={toggleNewCustomer}
                  className="btn btn-secondary"
                >
                  {formData.isNewCustomer ? 'Use Existing' : '+ New Customer'}
                </button>
              </div>
            </div>

            {/* New Customer Form */}
            {showNewCustomerForm && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 mb-4">New Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    className="input"
                    value={formData.customerInfo.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      customerInfo: { ...formData.customerInfo, name: e.target.value }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    className="input"
                    value={formData.customerInfo.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      customerInfo: { ...formData.customerInfo, phone: e.target.value }
                    })}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="input"
                    value={formData.customerInfo.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      customerInfo: { ...formData.customerInfo, email: e.target.value }
                    })}
                  />
                  <select
                    className="input"
                    value={formData.customerInfo.type}
                    onChange={(e) => setFormData({
                      ...formData,
                      customerInfo: { ...formData.customerInfo, type: e.target.value }
                    })}
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="walk-in">Walk-in</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Address"
                    className="input col-span-2"
                    value={formData.customerInfo.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      customerInfo: { ...formData.customerInfo, address: e.target.value }
                    })}
                  />
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <select
                    className="input col-span-6"
                    value={item.product}
                    onChange={(e) => handleProductSelect(e.target.value, index)}
                    required
                  >
                    <option value="">Select Product...</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.name} - {product.brand} ({product.stock.current} in stock) - ৳{product.sellingPrice}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Qty"
                    className="input col-span-2"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].quantity = parseInt(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }}
                    min="1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    className="input col-span-2"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].unitPrice = parseFloat(e.target.value);
                      setFormData({ ...formData, items: newItems });
                    }}
                    min="0"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = formData.items.filter((_, i) => i !== index);
                      setFormData({ ...formData, items: newItems });
                    }}
                    className="text-red-600 hover:text-red-800 col-span-1"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, items: [...formData.items, { product: '', quantity: 1, unitPrice: 0 }] })}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Item
              </button>
            </div>

            {/* Invoice Calculations */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Invoice Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                   <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">Discount:</label>
                  <input
                    type="number"
                    className="input w-24 text-right"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">Tax:</label>
                  <input
                    type="number"
                    className="input w-24 text-right"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                   <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="input"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                  <input
                    type="number"
                    className="input"
                    value={formData.paymentAmount}
                    onChange={(e) => setFormData({ ...formData, paymentAmount: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max={total}
                  />
                   <p className="text-sm text-gray-500">Due: {formatCurrency(total - formData.paymentAmount)}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="input"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Creating...' : 'Create Sales Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceForm;