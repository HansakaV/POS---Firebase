import React from 'react';

interface OrderItem {
  itemName: string;
  quantity: number;
  pricePerUnit: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  customDescription: string;
}

interface BillTemplateProps {
  order: Order;
}

const BillTemplate: React.FC<BillTemplateProps> = ({ order }) => {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', border: '1px solid #ccc' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Invoice</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <p><strong>Order ID:</strong> #{order.id.slice(-6)}</p>
          <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p><strong>Customer:</strong> {order.customerName}</p>
          <p><strong>Email:</strong> {order.customerEmail}</p>
          <p><strong>Phone:</strong> {order.customerPhone}</p>
        </div>
      </div>
      
      {order.customDescription && (
        <div style={{ marginBottom: '20px' }}>
          <p><strong>Description:</strong> {order.customDescription}</p>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Item</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Quantity</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Unit Price</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={index}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.itemName}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>${item.pricePerUnit.toFixed(2)}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}><strong>Total Amount</strong></td>
            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}><strong>${order.totalAmount.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
      
      <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#777' }}>
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
};

export default BillTemplate;