import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentService } from '../../services/payment.service';
import { useNavigate } from 'react-router-dom';
import '../../styles/payment.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#64748b' },
      iconColor: '#818cf8',
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  },
};

function CheckoutForm({ idempotencyKey, clientSecret, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setCardError('');

    const card = elements.getElement(CardElement);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      setCardError(result.error.message || 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }

    if (result.paymentIntent.status === 'succeeded') {
      try {
        await paymentService.confirmPayment(result.paymentIntent.id);
        onSuccess();
        navigate('/payment/success');
      } catch (err) {
        setCardError('Payment succeeded but server confirmation failed. Contact support.');
      }
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {cardError && <div className="payment-error-msg">⚠️ {cardError}</div>}

      <div className="stripe-card-wrapper">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      <button
        id="pay-now-btn"
        type="submit"
        className="btn-pay-now"
        disabled={!stripe || processing}
      >
        {processing ? '⏳ Processing...' : '💳 Pay ₹50 & Unlock Hard 60'}
      </button>

      <p className="payment-secure-note">
        🔒 Secured by Stripe. Your card info is never stored on our servers.
      </p>
    </form>
  );
}

function PaymentModal({ onClose, onPaymentSuccess }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loadError, setLoadError] = useState('');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await paymentService.createIntent(idempotencyKey);
        if (data.alreadyPaid) {
          onPaymentSuccess();
          onClose();
          return;
        }
        setClientSecret(data.clientSecret);
      } catch (err) {
        setLoadError(err?.response?.data?.message || 'Failed to initialize payment. Try again.');
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  return (
    <div className="payment-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="payment-modal">
        <button id="payment-modal-close" className="payment-modal-close" onClick={onClose}>×</button>

        <div className="payment-modal-badge">Premium Test</div>
        <h2>Unlock Hard 60</h2>
        <p className="payment-modal-desc">
          Get one-time access to the <strong>Hard Practice – 60 Questions</strong> test.
          Challenge yourself with advanced aptitude questions across all streams.
        </p>

        <ul className="payment-features-list">
          <li><span className="feat-icon">🎯</span> 60 Hard-level questions across 6 streams</li>
          <li><span className="feat-icon">⏱️</span> 60-minute full simulation test</li>
          <li><span className="feat-icon">📊</span> Detailed result breakdown & analysis</li>
          <li><span className="feat-icon">♾️</span> Unlimited reattempts once unlocked</li>
        </ul>

        <div className="payment-price-row">
          <div>
            <div className="payment-price-label">One-time payment</div>
            <div className="payment-price-note">Lifetime access. No subscription.</div>
          </div>
          <div className="payment-price-amount">₹50</div>
        </div>

        {loadError && <div className="payment-error-msg">⚠️ {loadError}</div>}

        {initializing && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '12px 0' }}>
            Initializing payment...
          </div>
        )}

        {!initializing && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              idempotencyKey={idempotencyKey}
              clientSecret={clientSecret}
              onSuccess={onPaymentSuccess}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

export default PaymentModal;
