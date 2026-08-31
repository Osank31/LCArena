export const mailTemplate = (OTP: string) => {
    return (`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Servora OTP Verification</title>

<style>
    body {
        margin: 0;
        padding: 0;
        background-color: #f4f7fb;
        font-family: Arial, sans-serif;
        color: #333333;
    }

    .email-container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    .header {
        background: linear-gradient(135deg, #4f46e5, #6d28d9);
        padding: 30px;
        text-align: center;
        color: #ffffff;
    }

    .header h1 {
        margin: 0;
        font-size: 32px;
        letter-spacing: 1px;
    }

    .content {
        padding: 40px 30px;
        text-align: center;
    }

    .content h2 {
        margin-top: 0;
        color: #111827;
        font-size: 24px;
    }

    .content p {
        font-size: 16px;
        line-height: 1.6;
        color: #4b5563;
    }

    .otp-box {
        margin: 30px auto;
        background-color: #eef2ff;
        border: 2px dashed #4f46e5;
        border-radius: 10px;
        padding: 18px 30px;
        display: inline-block;
    }

    .otp-code {
        font-size: 36px;
        font-weight: bold;
        letter-spacing: 8px;
        color: #4f46e5;
    }

    .expiry {
        margin-top: 15px;
        color: #dc2626;
        font-size: 14px;
        font-weight: bold;
    }

    .footer {
        background-color: #f9fafb;
        padding: 25px;
        text-align: center;
        font-size: 14px;
        color: #6b7280;
        border-top: 1px solid #e5e7eb;
    }

    .footer a {
        color: #4f46e5;
        text-decoration: none;
    }

    @media only screen and (max-width: 600px) {
        .content {
            padding: 30px 20px;
        }

        .otp-code {
            font-size: 28px;
            letter-spacing: 5px;
        }

        .header h1 {
            font-size: 26px;
        }
    }
</style>
</head>

<body>

<div class="email-container">

    <div class="header">
        <h1>Servora</h1>
    </div>

    <div class="content">
        <h2>OTP Verification</h2>

        <p>Hello,</p>

        <p>
            Use the following One-Time Password (OTP) to verify your account on
            <strong>Servora</strong>.
        </p>

        <div class="otp-box">
            <div class="otp-code">
                ${OTP}
            </div>
        </div>

        <div class="expiry">
            This OTP will expire in 5 minutes.
        </div>

        <p style="margin-top: 30px;">
            If you did not request this verification code, please ignore this email.
        </p>
    </div>

    <div class="footer">
        <p>
            © 2026 Servora. All rights reserved.
        </p>

        <p>
            Founder: <strong>Osank Verma</strong>
        </p>

        <p>
            Support:
            <a href="mailto:osankverma2004@gmail.com">
                osankverma2004@gmail.com
            </a>
        </p>
    </div>

</div>

</body>
</html>
`)

}