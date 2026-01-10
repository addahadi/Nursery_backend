import { transporter } from '../utils/email.js';

export const sendParentApprovalEmail = async ({ email, fullName }) => {
  const paymentLink = `${process.env.FRONTEND_URL}/complete-payment`;

  await transporter.sendMail({
    from: `"منصتكم التعليمية" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'تمت الموافقة على تسجيلك',
    html: `
      <div style="
        font-family: 'Arial', sans-serif; 
        background-color: #f9f9f9; 
        padding: 20px; 
        border-radius: 10px;
        max-width: 600px;
        margin: auto;
        border: 1px solid #e0e0e0;
      ">
        <h2 style="color: #1e40af; text-align: center;">مرحباً ${fullName} 👋</h2>

        <p style="font-size: 16px; color: #333;">
          تم مراجعة تسجيلك والموافقة عليه من قبل فريقنا.
        </p>

        <p style="font-size: 16px; color: #333;">
          لتفعيل حسابك، يرجى إتمام عملية الدفع من خلال الرابط أدناه:
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${paymentLink}" style="
            display: inline-block;
            padding: 14px 28px;
            background-color: #2563eb;
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
            text-decoration: none;
            border-radius: 8px;
          ">
            إتمام الدفع
          </a>
        </div>

        <p style="font-size: 14px; color: #555;">
          إذا كانت لديك أي استفسارات، يرجى التواصل مع الدعم الفني.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />

        <p style="font-size: 12px; color: #888; text-align: center;">
          © 2026 منصتكم التعليمية. جميع الحقوق محفوظة.
        </p>
      </div>
    `,
  });
};
