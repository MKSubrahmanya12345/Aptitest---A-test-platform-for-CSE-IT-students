import { useNavigate } from "react-router-dom";
import "../styles/payment.css";

function PaymentSuccess() {
  const navigate = useNavigate();

  return (
    <div className="payment-success-overlay">
      <div className="payment-success-card">
        <div className="success-icon-ring">
          <svg viewBox="0 0 52 52" className="success-checkmark-svg">
            <circle className="success-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h2 className="success-title">Payment Successful!</h2>
        <p className="success-subtitle">
          You now have <strong>full access</strong> to the <br />
          <span className="success-test-name">Hard Practice – 60 Questions</span> test.
        </p>
        <div className="success-receipt">
          <div className="receipt-row">
            <span>Amount Paid</span>
            <span className="receipt-val">₹50.00</span>
          </div>
          <div className="receipt-row">
            <span>Test Access</span>
            <span className="receipt-val green">Hard 60 ✓</span>
          </div>
        </div>
        <button
          id="back-to-dashboard-btn"
          className="btn-go-dashboard"
          onClick={() => navigate("/dashboard")}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default PaymentSuccess;
