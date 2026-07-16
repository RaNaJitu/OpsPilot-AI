
const { config } = require('../config');

const {sgMail} =  require("@sendgrid/mail");

sgMail.setApiKey(env.SENDGRID_API_KEY)

const minutes = (env.OTP_TTL || 300) / 60;

// async function sendOTPEmail(email: string, otp: number){
//     const emailSubject = "Varivied Email"
//     const msg = {
//         to: email,
//         from: `${env.EMAIL_SEND}`,
//         subject: emailSubject,
//         html: ``
//     }

// }

//#region Send OTP Email
async function sendOTPEmail(email, otp) {
  const emailSubject = "Verify Your Email Address";

  const msg = {
    to: email,
    from: config.MAIL_SEND,
    subject: emailSubject,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email Verification</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;">
          
          <tr>
            <td style="background:#0f172a;padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;">
                IRCTC
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 35px;">
              <h2 style="margin:0;color:#222;font-size:24px;">
                Verify Your Email
              </h2>

              <p style="margin:20px 0;color:#555;font-size:16px;line-height:1.6;">
                Hello,
              </p>

              <p style="margin:0 0 20px;color:#555;font-size:16px;line-height:1.6;">
                Thank you for registering. Please use the One-Time Password (OTP) below to verify your email address.
              </p>

              <div style="margin:35px 0;text-align:center;">
                <div style="
                  display:inline-block;
                  background:#f3f4f6;
                  border:2px dashed #2563eb;
                  color:#2563eb;
                  font-size:36px;
                  font-weight:bold;
                  letter-spacing:10px;
                  padding:18px 40px;
                  border-radius:10px;">
                  ${otp}
                </div>
              </div>

              <p style="color:#555;font-size:15px;line-height:1.6;">
                This OTP is valid for <strong>5 minutes</strong>.
              </p>

              <p style="color:#555;font-size:15px;line-height:1.6;">
                Do not share this OTP with anyone. Our team will never ask you for your verification code.
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;" />

              <p style="color:#777;font-size:14px;line-height:1.6;">
                If you did not request this verification, you can safely ignore this email.
              </p>

              <p style="margin-top:35px;color:#555;font-size:15px;">
                Regards,<br />
                <strong>IRCTC Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;color:#888;font-size:13px;">
              © ${new Date().getFullYear()} IRCTC. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`,
  };
console.log("Sending OTP email to:", email, "from:", env.EMAIL_SEND, "with OTP:", otp);
  await sgMail.send(msg);
}
//#endregion

// #region Verify OTP Email
async function verifyOTPEmail(email, data) {
  const emailSubject = `Welcome To ${data.firstName} ${data.lastName}, your email is verified`;
  const msg = {
    to: email,
    from: `${config.MAIL_SEND}`,
    subject: emailSubject,
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
            <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;">
                <tr>
                    <td style="background:#0f172a;padding:24px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;">
                        IRCTC
                    </h1>
                    </td>
                </tr>

                <tr>
                    <td style="padding:40px 35px;">
                    <h2 style="margin:0;color:#222;font-size:24px;">
                        Email Verified
                    </h2>

                    <p style="margin:20px 0;color:#555;font-size:16px;line-height:1.6;">
                        Hello,
                    </p>

                    <p style="margin:0 0 20px;color:#555;font-size:16px;line-height:1.6;">
                        Thank you for verifying your email address.
                    </p>

                    <p style="margin-top:35px;color:#555;font-size:15px;">
                        Regards,<br />
                        <strong>IRCTC Team</strong>
                    </p>
                    </td>
                </tr>

                <tr>
                    <td style="background:#f8fafc;padding:20px;text-align:center;color:#888;font-size:13px;">
                    © ${new Date().getFullYear()} IRCTC. All rights reserved.
                    </td>
                </tr>

                </table>

            </td>
            </tr>
        </table>
        </body>
        </html>
        `,
    };
}
// #endregion

module.exports = {
    sendOTPEmail, 
    verifyOTPEmail
}
