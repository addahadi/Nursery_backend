import { transporter } from '../utils/email.js';

export const sendParentApprovalEmail = async ({ email, fullName }) => {
  const paymentLink = `${process.env.FRONTEND_URL}/complete-payment`;

  await transporter.sendMail({
    from: `"Your Platform" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your registration has been approved',
    html: `
      <p>Hello <strong>${fullName}</strong>,</p>

      <p>Your registration has been reviewed and approved by our team.</p>

      <p>To activate your account, please complete your payment:</p>

      <p>
        <a href="${paymentLink}"
           style="padding:12px 20px;
                  background:#2563eb;
                  color:white;
                  text-decoration:none;
                  border-radius:6px;">
          Complete Payment
        </a>
      </p>

      <p>If you have questions, contact support.</p>
    `,
  });
};
