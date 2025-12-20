const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

const generateInvoicePDF = async (invoice, customer = null, supplier = null) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    const htmlContent = generateInvoiceHTML(invoice, customer, supplier);

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    const filename = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, '../uploads/invoices', filename);

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, pdfBuffer);
    } catch (error) {
      console.error('Error saving PDF:', error);
    }

    return {
      filename,
      path: filePath,
      buffer: pdfBuffer
    };

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const generateInvoiceHTML = (invoice, customer, supplier) => {
  const isSale = invoice.type === 'sale';
  const party = isSale ? customer : supplier;
  const businessInfo = {
    name: process.env.BUSINESS_NAME || 'Spare Parts Zone',
    address: process.env.BUSINESS_ADDRESS || 'Your Business Address',
    phone: process.env.BUSINESS_PHONE || 'Your Phone Number',
    email: process.env.BUSINESS_EMAIL || 'your@email.com'
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${isSale ? 'Invoice' : 'Purchase Order'} - ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
        }
        .business-info {
          text-align: right;
          font-size: 14px;
        }
        .invoice-title {
          text-align: center;
          margin: 20px 0;
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
        }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 5px;
        }
        .party-info {
          margin: 20px 0;
        }
        .party-info h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 16px;
        }
        .party-info p {
          margin: 5px 0;
          font-size: 14px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
        }
        .items-table th {
          background-color: #f3f4f6;
          font-weight: bold;
          color: #1f2937;
        }
        .items-table .text-right {
          text-align: right;
        }
        .totals {
          display: flex;
          justify-content: flex-end;
          margin-top: 20px;
        }
        .totals table {
          width: 300px;
        }
        .totals td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        .totals .total-row td {
          font-weight: bold;
          background-color: #f9fafb;
        }
        .notes {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9fafb;
          border-radius: 5px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          text-align: center;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">${businessInfo.name}</div>
          <div style="font-size: 14px; margin-top: 5px;">
            ${businessInfo.address}<br>
            ${businessInfo.phone}<br>
            ${businessInfo.email}
          </div>
        </div>
        <div class="business-info">
          <strong>${isSale ? 'Invoice' : 'Purchase Order'} #</strong><br>
          ${invoice.invoiceNumber}<br><br>
          <strong>Date:</strong> ${new Date(invoice.date || invoice.createdAt).toLocaleDateString()}<br>
          <strong>Due Date:</strong> ${new Date(invoice.dueDate || invoice.createdAt).toLocaleDateString()}<br>
          <strong>Status:</strong> ${invoice.status}<br>
          <strong>Payment Status:</strong> ${invoice.paymentStatus}
        </div>
      </div>

      <div class="invoice-title">
        ${isSale ? 'INVOICE' : 'PURCHASE ORDER'}
      </div>

      <div class="party-info">
        <h3>${isSale ? 'Bill To:' : 'Supplier:'}</h3>
        <p><strong>${party?.name || 'N/A'}</strong></p>
        ${party?.email ? `<p>Email: ${party.email}</p>` : ''}
        ${party?.phone ? `<p>Phone: ${party.phone}</p>` : ''}
        ${party?.address?.street ? `<p>Address: ${party.address.street}</p>` : ''}
        ${party?.address?.city ? `<p>${party.address.city}, ${party.address.state}</p>` : ''}
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>Description</th>
            <th class="text-right">Quantity</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.product?.name || 'Product'}</td>
              <td>${item.description || '-'}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">৳${item.unitPrice.toLocaleString()}</td>
              <td class="text-right">৳${item.totalPrice.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">৳${invoice.subtotal.toLocaleString()}</td>
          </tr>
          ${invoice.discount > 0 ? `
            <tr>
              <td>Discount:</td>
              <td class="text-right">-৳${invoice.discount.toLocaleString()}</td>
            </tr>
          ` : ''}
          ${invoice.tax > 0 ? `
            <tr>
              <td>Tax:</td>
              <td class="text-right">৳${invoice.tax.toLocaleString()}</td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Total:</strong></td>
            <td class="text-right"><strong>৳${invoice.total.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Amount Paid:</td>
            <td class="text-right">৳${invoice.getAmountPaid().toLocaleString()}</td>
          </tr>
          <tr>
            <td>Amount Due:</td>
            <td class="text-right"><strong>৳${invoice.getAmountDue().toLocaleString()}</strong></td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
        <div class="notes">
          <h3>Notes:</h3>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>This is a computer-generated ${isSale ? 'invoice' : 'purchase order'}. No signature is required.</p>
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  generateInvoicePDF
};