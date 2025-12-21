import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../utils/currency';

const PurchaseInvoiceForm = ({ onSubmit, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    supplier: '',
    isNewSupplier: false,
    supplierInfo: {
      businessInfo: {
        companyName: '',
        address: '',
        phone: '',
        email: ''
      },
      contactPerson: {
        name: '',
        phone: '',
        email: ''
      }
    },
    items: [{ product: '', quantity: 1, unitPrice: 0, isNewProduct: false }],
    discount: 0,
    tax: 0,
    notes: '',
    paymentAmount: 0,
    paymentMethod: 'bank_transfer'
  });

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Electronics', 'Engine Parts', 'Body Parts', 'Accessories', 'Oil & Fluids', 'Tires & Wheels', 'Brake System', 'Battery & Electrical', 'Transmission', 'Suspension', 'Lighting', 'Tools & Equipment', 'Other']);
  const [showNewProductForms, setShowNewProductForms] = useState({});
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);

  const { data: suppliersData } = useQuery(
    'suppliers',
    async () => {
      const response = await api.get('/suppliers');
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
    if (suppliersData?.suppliers) {
      setSuppliers(suppliersData.suppliers);
    }
    if (productsData?.products) {
      setProducts(productsData.products);
    }
  }, [suppliersData, productsData]);

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      const price = item.isNewProduct ? (item.newProductInfo?.costPrice || 0) : (item.unitPrice || 0);
      const quantity = item.quantity || 0;
      return sum + (price * quantity);
    }, 0);
    const total = Math.max(0, subtotal - formData.discount + formData.tax);
    return { subtotal, total };
  };

  const { subtotal, total } = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.isNewSupplier && !formData.supplier) {
      toast.error('Please select a supplier');
      return;
    }
    if (formData.isNewSupplier && (!formData.supplierInfo.businessInfo.companyName || !formData.supplierInfo.contactPerson.name)) {
      toast.error('Please provide company name and contact person for new supplier');
      return;
    }
    
    if (!formData.items || formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.isNewProduct && !item.product) {
        toast.error(`Please select a product for item ${i + 1}`);
        return;
      }
      if (item.isNewProduct && (!item.newProductInfo?.name || !item.newProductInfo?.brand)) {
        toast.error(`Please provide product name and brand for item ${i + 1}`);
        return;
      }
      if (!item.quantity || item.quantity < 1) {
        toast.error(`Please provide valid quantity for item ${i + 1}`);
        return;
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        toast.error(`Please provide valid price for item ${i + 1}`);
        return;
      }
    }
    
    const submitData = {
      ...formData,
      subtotal,
      total,
      type: 'purchase'
    };

    if (formData.isNewSupplier) {
      submitData.supplierInfo = formData.supplierInfo;
    }

    onSubmit(submitData);
  };

  const handleProductSelect = (productId, index) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const newItems = [...formData.items];
      newItems[index].product = productId;
      newItems[index].unitPrice = product.costPrice;
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleQuantityChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].quantity = parseInt(value) || 1;
    setFormData({ ...formData, items: newItems });
  };

  const handlePriceChange = (index, value) => {
    const newItems = [...formData.items];
    newItems[index].unitPrice = parseFloat(value) || 0;
    setFormData({ ...formData, items: newItems });
  };

  const handleNewProductChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index].newProductInfo = {
      ...newItems[index].newProductInfo,
      [field]: value
    };

    // Auto-calculate selling price when cost price changes
    if (field === 'costPrice' && value > 0) {
      const calculatedSellingPrice = parseFloat(value) * 1.1;
      newItems[index].newProductInfo.sellingPrice = calculatedSellingPrice;
    }

    setFormData({ ...formData, items: newItems });
  };

  const toggleNewProduct = (index) => {
    const newShowNewProductForms = { ...showNewProductForms };
    newShowNewProductForms[index] = !newShowNewProductForms[index];
    setShowNewProductForms(newShowNewProductForms);

    const newItems = [...formData.items];
    newItems[index].isNewProduct = !newItems[index].isNewProduct;
    if (newItems[index].isNewProduct) {
      newItems[index].newProductInfo = {
        name: '',
        brand: '',
        category: '',
        sku: '',
        costPrice: 0,
        sellingPrice: 0,
        unit: 'pieces'
      };
    }
    setFormData({ ...formData, items: newItems });
  };

  const toggleNewSupplier = () => {
    setShowNewSupplierForm(!showNewSupplierForm);
    setFormData({ ...formData, isNewSupplier: !formData.isNewSupplier });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Purchase Invoice</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <div className="flex gap-2">
                {!formData.isNewSupplier && (
                  <select
                    className="input flex-1"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required={!formData.isNewSupplier}
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.businessInfo.companyName} - {supplier.contactPerson.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={toggleNewSupplier}
                  className="btn btn-secondary"
                >
                  {formData.isNewSupplier ? 'Use Existing' : '+ New Supplier'}
                </button>
              </div>
            </div>

            {/* New Supplier Form */}
            {showNewSupplierForm && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 mb-4">New Supplier Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Company Name"
                    className="input"
                    value={formData.supplierInfo.businessInfo.companyName}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        businessInfo: {
                          ...formData.supplierInfo.businessInfo,
                          companyName: e.target.value
                        }
                      }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Contact Person Name"
                    className="input"
                    value={formData.supplierInfo.contactPerson.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        contactPerson: {
                          ...formData.supplierInfo.contactPerson,
                          name: e.target.value
                        }
                      }
                    })}
                  />
                  <input
                    type="email"
                    placeholder="Company Email"
                    className="input"
                    value={formData.supplierInfo.businessInfo.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        businessInfo: {
                          ...formData.supplierInfo.businessInfo,
                          email: e.target.value
                        }
                      }
                    })}
                  />
                  <input
                    type="email"
                    placeholder="Contact Person Email"
                    className="input"
                    value={formData.supplierInfo.contactPerson.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        contactPerson: {
                          ...formData.supplierInfo.contactPerson,
                          email: e.target.value
                        }
                      }
                    })}
                  />
                  <input
                    type="tel"
                    placeholder="Company Phone"
                    className="input"
                    value={formData.supplierInfo.businessInfo.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        businessInfo: {
                          ...formData.supplierInfo.businessInfo,
                          phone: e.target.value
                        }
                      }
                    })}
                  />
                  <input
                    type="tel"
                    placeholder="Contact Person Phone"
                    className="input"
                    value={formData.supplierInfo.contactPerson.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        contactPerson: {
                          ...formData.supplierInfo.contactPerson,
                          phone: e.target.value
                        }
                      }
                    })}
                  />
                  <input
                    type="text"
                    placeholder="Company Address"
                    className="input col-span-2"
                    value={formData.supplierInfo.businessInfo.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      supplierInfo: {
                        ...formData.supplierInfo,
                        businessInfo: {
                          ...formData.supplierInfo.businessInfo,
                          address: e.target.value
                        }
                      }
                    })}
                  />
                </div>
              </div>
            )}

            {/* Items */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleNewProduct(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {item.isNewProduct ? 'Use Existing' : '+ New Product'}
                      </button>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formData.items.filter((_, i) => i !== index);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {!item.isNewProduct ? (
                    // Existing Product Selection
                    <div className="grid grid-cols-12 gap-2 mb-3">
                      <select
                        className="input col-span-6"
                        value={item.product}
                        onChange={(e) => handleProductSelect(e.target.value, index)}
                        required
                      >
                        <option value="">Select Product...</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name} - {product.brand} - {product.sku} (Stock: {product.stock?.current || 0})
                          </option>
                        ))}
                      </select>
                        <input
                          type="number"
                          placeholder="Qty"
                          className="input col-span-2"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          min="1"
                          required
                        />
                        <input
                          type="number"
                          placeholder="Cost Price"
                          className="input col-span-2"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          min="0"
                          required
                        />
                    </div>
                  ) : (
                    // New Product Form
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Product Name"
                          className="input"
                          value={item.newProductInfo?.name || ''}
                          onChange={(e) => handleNewProductChange(index, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Brand"
                          className="input"
                          value={item.newProductInfo?.brand || ''}
                          onChange={(e) => handleNewProductChange(index, 'brand', e.target.value)}
                        />
                        <select
                          className="input"
                          value={item.newProductInfo?.category || ''}
                          onChange={(e) => handleNewProductChange(index, 'category', e.target.value)}
                        >
                          <option value="">Select Category...</option>
                          {categories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="SKU"
                          className="input"
                          value={item.newProductInfo?.sku || ''}
                          onChange={(e) => handleNewProductChange(index, 'sku', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          placeholder="Cost Price"
                          className="input"
                          value={item.newProductInfo?.costPrice || ''}
                          onChange={(e) => handleNewProductChange(index, 'costPrice', parseFloat(e.target.value))}
                        />
                        <input
                          type="number"
                          placeholder="Selling Price"
                          className="input"
                          value={item.newProductInfo?.sellingPrice || ''}
                          onChange={(e) => handleNewProductChange(index, 'sellingPrice', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          className="input"
                          value={item.newProductInfo?.unit || 'pieces'}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].newProductInfo = {
                              ...newItems[index].newProductInfo,
                              unit: e.target.value
                            };
                            setFormData({ ...formData, items: newItems });
                          }}
                        >
                          <option value="pieces">Pieces</option>
                          <option value="boxes">Boxes</option>
                          <option value="sets">Sets</option>
                          <option value="kits">Kits</option>
                          <option value="liters">Liters</option>
                          <option value="kg">Kilograms</option>
                          <option value="meters">Meters</option>
                        </select>
                          <input
                            type="number"
                            placeholder="Quantity"
                            className="input"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].quantity = parseInt(e.target.value);
                              setFormData({ ...formData, items: newItems });
                            }}
                            min="1"
                            required
                          />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, items: [...formData.items, { product: '', quantity: 1, unitPrice: 0, isNewProduct: false }] })}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Item
              </button>
            </div>

            {/* Invoice Summary */}
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
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
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
                {isLoading ? 'Creating...' : 'Create Purchase Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceForm;