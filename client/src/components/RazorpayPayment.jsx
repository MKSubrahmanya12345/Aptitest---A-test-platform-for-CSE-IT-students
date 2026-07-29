import { useState } from 'react';
import api from '../services/api';
import '../styles/razorpay-payment.css';

function RazorpayPayment({ testType = 'hard_60', templateId, onSuccess, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState(null); // 'upi' or 'card'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async (method) => {
    setPaymentMethod(method);
    setLoading(true);
    setError('');

    try {
      // Create order on backend
      const { data } = await api.post('/razorpay/create-order', {
        testType,
        templateId,
        paymentMethod: method,
      });

      if (data.alreadyPaid) {
        onSuccess();
        return;
      }

      // Load Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'AptiTest',
        description: 'Test Access Payment',
        order_id: data.orderId,
        handler: async (response) => {
          // Verify payment
          try {
            await api.post('/razorpay/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            onSuccess();
          } catch (err) {
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: data.userName,
          email: data.userEmail,
        },
        method: {
          upi: method === 'upi',
          card: method === 'card',
          netbanking: false,
          wallet: false,
        },
        theme: {
          color: '#6366f1',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response) {
        setError('Payment failed. Please try again.');
        setLoading(false);
      });

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <div className="razorpay-payment-modal">
      <div className="payment-modal-content">
        <div className="payment-header">
          <h2>Complete Payment</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="payment-amount">
          <span className="amount-label">Amount:</span>
          <span className="amount-value">₹1.00</span>
        </div>

        <p className="payment-description">
          Pay ₹1 to unlock Hard 60 test access
        </p>

        {error && <div className="payment-error">{error}</div>}

        <div className="payment-options">
          <button
            className={`payment-option-btn ${paymentMethod === 'upi' ? 'selected' : ''}`}
            onClick={() => handlePayment('upi')}
            disabled={loading}
          >
            <span className="payment-icon">📱</span>
            <span className="payment-label">UPI</span>
            <span className="payment-sub">Google Pay, PhonePe, Paytm</span>
          </button>

          <button
            className={`payment-option-btn ${paymentMethod === 'card' ? 'selected' : ''}`}
            onClick={() => handlePayment('card')}
            disabled={loading}
          >
            <span className="payment-icon">💳</span>
            <span className="payment-label">Card</span>
            <span className="payment-sub">Credit/Debit Card</span>
          </button>
        </div>

        {loading && (
          <div className="payment-loading">
            <div className="spinner"></div>
            <span>Loading payment...</span>
          </div>
        )}

        <p className="payment-secure">
          🔒 Secured by Razorpay
        </p>
      </div>
    </div>
  );
}

export default RazorpayPayment;
