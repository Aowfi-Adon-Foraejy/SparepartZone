import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';

const QuickInvoiceForm = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    items: [{ product: '', quantity: 1, unitPrice: 0 }],
    notes: '',
    customerName: '',
    customerPhone: ''
  });

  const [products, setProducts] = useState([]);

  const { data: productsData } = useQuery(
    'products',
    async () => {
      const response = await api.get('/products');
      return response.data;
    }
  );

  useEffect(() => {
    if (productsData?.products) {
      setProducts(productsData.products);
    }
  }, [productsData]);

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const total = calculateTotal();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      type: 'quick',
      items: formData.items,
      notes: formData.notes,
      total,
      paymentAmount: total,
      paymentMethod: 'cash',
      customerInfo: {
        name: formData.customerName || 'Walk-in Customer',
        phone: formData.customerPhone || '0000000000', // Use consistent phone to avoid duplicates
        email: '',
        type: 'walk-in'
      }
    };

    console.log('Submitting quick invoice:', submitData);
    onSubmit(submitData);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Quick Invoice (Walk-in Sale)</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Info */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  className="input"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Phone Number (Optional)"
                  className="input"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
            </div>

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

            {/* Total */}
            <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-gray-900 mb-3">Total Amount (Cash Payment)</h3>
                 <span className="text-2xl font-bold text-green-600">{formatCurrency(total)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">This quick invoice records an immediate cash sale.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="input"
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any special notes for this quick sale..."
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
                className="btn btn-accent"
              >
                {isLoading ? 'Creating...' : 'Create Quick Sale'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuickInvoiceForm;