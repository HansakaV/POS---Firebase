import React from 'react';

interface PaymentDetails {
  customerName: string;
  paymentAmount: number;
  newBalance: number;
  paymentDate: string;
}

const PaymentConfirmationTemplate: React.FC<{ payment: PaymentDetails }> = ({ payment }) => {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', border: '1px solid #ccc' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Payment Confirmation</h1>
      <div style={{ marginBottom: '20px' }}>
        <p>Dear {payment.customerName},</p>
        <p>
          This email confirms that we have received your payment of <strong>${payment.paymentAmount.toFixed(2)}</strong> on {new Date(payment.paymentDate).toLocaleDateString()}.
        </p>
        <p>
          Your new outstanding balance is <strong>${payment.newBalance.toFixed(2)}</strong>.
        </p>
        <p>
          Thank you for your prompt payment.
        </p>
      </div>
      <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '12px', color: '#777' }}>
        <p>Thank you for your business!</p>
        <p>DP Communication</p>
      </div>
    </div>
  );
};

export default PaymentConfirmationTemplate;