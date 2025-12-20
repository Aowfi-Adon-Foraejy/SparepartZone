const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});
    await Supplier.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@sparepartzone.com',
      password: 'admin123',
      role: 'admin',
      isActive: true,
      isApproved: true,
      profile: {
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+2348000000000'
      }
    });
    await adminUser.save();
    console.log('Created admin user');

    // Create sample products
    const products = [
      {
        name: 'Engine Oil',
        brand: 'Mobil',
        category: 'Lubricants',
        sku: 'EO001',
        description: 'High quality synthetic engine oil',
        costPrice: 2500,
        sellingPrice: 3500,
        stock: {
          current: 50,
          reorderThreshold: 10,
          minStock: 5
        },
        unit: 'liters',
        specifications: {
          weight: 1,
          warranty: 12
        }
      },
      {
        name: 'Brake Pads',
        brand: 'Bosch',
        category: 'Brakes',
        sku: 'BP001',
        description: 'Front brake pads set',
        costPrice: 8000,
        sellingPrice: 12000,
        stock: {
          current: 25,
          reorderThreshold: 8,
          minStock: 3
        },
        unit: 'sets',
        specifications: {
          weight: 2,
          warranty: 6
        }
      },
      {
        name: 'Air Filter',
        brand: 'Fram',
        category: 'Filters',
        sku: 'AF001',
        description: 'Engine air filter',
        costPrice: 1500,
        sellingPrice: 2200,
        stock: {
          current: 3,
          reorderThreshold: 15,
          minStock: 5
        },
        unit: 'pieces',
        specifications: {
          weight: 0.5,
          warranty: 3
        }
      }
    ];

    for (const productData of products) {
      const product = new Product(productData);
      await product.save();
    }
    console.log('Created sample products');

    // Create sample customers
    const customers = [
      {
        name: 'John Doe',
        email: 'john.doe@email.com',
        phone: '+2348000000001',
        address: {
          street: '123 Main St',
          city: 'Lagos',
          state: 'Lagos',
          postalCode: '100001'
        },
        type: 'individual',
        paymentTerms: 'cash',
        createdBy: adminUser._id
      },
      {
        name: 'ABC Motors',
        email: 'info@abcmotors.com',
        phone: '+2348000000002',
        address: {
          street: '456 Industrial Ave',
          city: 'Lagos',
          state: 'Lagos',
          postalCode: '100002'
        },
        type: 'business',
        businessInfo: {
          companyName: 'ABC Motors Limited',
          registrationNumber: 'RC123456',
          contactPerson: 'James Smith'
        },
        creditLimit: 500000,
        paymentTerms: 'credit',
        creditDays: 30,
        createdBy: adminUser._id
      }
    ];

    for (const customerData of customers) {
      const customer = new Customer(customerData);
      await customer.save();
    }
    console.log('Created sample customers');

    // Create sample suppliers
    const suppliers = [
      {
        name: 'Global Auto Parts',
        email: 'sales@globalautoparts.com',
        phone: '+2348000000003',
        address: {
          street: '789 Supplier Road',
          city: 'Lagos',
          state: 'Lagos',
          postalCode: '100003'
        },
        businessInfo: {
          companyName: 'Global Auto Parts Ltd'
        },
        contactPerson: {
          name: 'Sarah Johnson'
        },
        categories: ['Engine Parts', 'Brakes', 'Filters'],
        paymentTerms: 'net30',
        createdBy: adminUser._id
      },
      {
        name: 'Premium Lubricants',
        email: 'orders@premiumlube.com',
        phone: '+2348000000004',
        address: {
          street: '321 Oil Street',
          city: 'Lagos',
          state: 'Lagos',
          postalCode: '100004'
        },
        businessInfo: {
          companyName: 'Premium Lubricants Nigeria'
        },
        contactPerson: {
          name: 'Michael Brown'
        },
        categories: ['Lubricants'],
        paymentTerms: 'net15',
        createdBy: adminUser._id
      }
    ];

    for (const supplierData of suppliers) {
      const supplier = new Supplier(supplierData);
      await supplier.save();
    }
    console.log('Created sample suppliers');

    console.log('Database seeded successfully!');
    console.log('\\nLogin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@sparepartzone.com');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed function
seedData();