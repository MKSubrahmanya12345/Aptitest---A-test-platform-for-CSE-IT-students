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

function PaymentModal({ onClose, onPaymentSuccess, templateId, templateName, pricePaise = 5000 }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loadError, setLoadError] = useState('');
  const [initializing, setInitializing] = useState(true);

  // Determine if this is the legacy hard_60 template
  const isLegacyHard60 = templateId === 'hard_60' || !templateId;
  const priceRupees = pricePaise / 100;

  useEffect(() => {
    (async () => {
      try {
        // Pass templateId for dynamic test types
        const testType = isLegacyHard60 ? 'hard_60' : `template_${templateId}`;
        const data = await paymentService.createIntent(idempotencyKey, testType, templateId);
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
  }, [templateId]);

  return (
    <div className="payment-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="payment-modal">
        <button id="payment-modal-close" className="payment-modal-close" onClick={onClose}>×</button>

        <div className="payment-modal-badge">Premium Test</div>
        <h2>{isLegacyHard60 ? 'Unlock Hard 60' : `Unlock ${templateName || 'Premium Test'}`}</h2>
        <p className="payment-modal-desc">
          {isLegacyHard60 ? (
            <>
              Get one-time access to the <strong>Hard Practice – 60 Questions</strong> test.
              Challenge yourself with advanced aptitude questions across all streams.
            </>
          ) : (
            <>
              Get one-time access to the <strong>{templateName}</strong> test.
              Challenge yourself with premium aptitude questions.
            </>
          )}
        </p>

        <ul className="payment-features-list">
          <li><span className="feat-icon">🎯</span> Premium questions across selected topics</li>
          <li><span className="feat-icon">⏱️</span> Full simulation test experience</li>
          <li><span className="feat-icon">📊</span> Detailed result breakdown & analysis</li>
          <li><span className="feat-icon">♾️</span> Unlimited reattempts once unlocked</li>
        </ul>

        <div className="payment-price-row">
          <div>
            <div className="payment-price-label">One-time payment</div>
            <div className="payment-price-note">Lifetime access. No subscription.</div>
          </div>
          <div className="payment-price-amount">₹{priceRupees}</div>
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
              priceRupees={priceRupees}
              templateName={templateName}
              isLegacyHard60={isLegacyHard60}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

function CheckoutForm({ idempotencyKey, clientSecret, onSuccess, onCancel, priceRupees, templateName, isLegacyHard60 }) {
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

  const buttonText = processing 
    ? '⏳ Processing...' 
    : `💳 Pay ₹${priceRupees} & Unlock ${isLegacyHard60 ? 'Hard 60' : templateName || 'Premium Test'}`;

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
        {buttonText}
      </button>

      <p className="payment-secure-note">
        🔒 Secured by Stripe. Your card info is never stored on our servers.
      </p>
    </form>
  );
}

export default PaymentModal;
