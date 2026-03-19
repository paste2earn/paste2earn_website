const { Resend } = require('resend');

let resend = null;

function initializeResend() {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ Resend API key not configured. Email notifications disabled.');
        return;
    }

    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend email service initialized');
}

async function sendApprovalEmail(user) {
    if (!resend) {
        console.warn('Resend not initialized. Skipping email notification.');
        return;
    }

    try {
        const logoUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/public/images/logo.jpg`;

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 20%, #a855f7 80%, #7c3aed 100%);
            color: #ffffff;
            padding: 40px 20px;
            text-align: center;
        }
        .header img {
            max-width: 280px;
            height: auto;
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
            color: #333333;
        }
        .content h2 {
            background: linear-gradient(135deg, #4facfe 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 24px;
            margin-top: 0;
        }
        .content p {
            line-height: 1.6;
            font-size: 16px;
            margin: 15px 0;
        }
        .cta-button {
            display: inline-block;
            margin: 30px 0;
            padding: 15px 40px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 20%, #fbbf24 50%, #a855f7 80%, #7c3aed 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .features {
            background: linear-gradient(135deg, #eff6ff 0%, #faf5ff 100%);
            border-left: 4px solid #a855f7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .features ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .features li {
            margin: 8px 0;
            color: #555555;
        }
        .footer {
            background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
            padding: 20px;
            text-align: center;
            color: #777777;
            font-size: 14px;
        }
        .footer a {
            color: #a855f7;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="${logoUrl}" alt="Paste2Earn Logo" />
        </div>
        <div class="content">
            <h2>Congratulations ${user.username}!</h2>
            <p>Great news! Your account has been <strong>approved</strong> as <strong style="color: ${user.tier === 'gold' ? '#FFD700' : '#C0C0C0'};">${user.tier === 'gold' ? '🥇 Gold Tier' : '🥈 Silver Tier'}</strong> and you're now ready to start earning.</p>
            
            <div class="features">
                <p><strong>Your account access:</strong></p>
                <ul>
                    ${user.tier === 'gold' ? `
                    <li><strong>🥇 Gold Tier Access</strong> - You can claim both comment and post tasks!</li>
                    <li>Higher earning potential with post tasks ($2.00 each)</li>
                    ` : `
                    <li><strong>🥈 Silver Tier Access</strong> - You can claim comment and reply tasks</li>
                    <li>Upgrade to Gold with 1,000+ karma and 1+ year account age for post tasks</li>
                    `}
                    <li>Browse and claim available tasks</li>
                    <li>Earn rewards for each completed task</li>
                    <li>Track your earnings in your wallet</li>
                    <li>Request withdrawals via Crypto (any amount)</li>
                </ul>
            </div>

            <p>Login to your account and start exploring available tasks to maximize your earnings!</p>

            <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/" class="cta-button">
                    Login & Start Earning
                </a>
            </center>

            <p style="margin-top: 30px;">If you have any questions or need assistance, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Paste2Earn. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
        `;

        const { data, error } = await resend.emails.send({
            from: 'Paste2Earn <notifications@paste2earn.com>',
            to: [user.email],
            subject: '🎉 Your Account Has Been Approved - Start Earning Now!',
            html: emailHtml
        });

        if (error) {
            console.error('❌ Failed to send approval email:', error);
            return;
        }

        console.log(`✅ Approval email sent to ${user.email} (ID: ${data.id})`);
    } catch (error) {
        console.error('❌ Error sending approval email:', error.message);
    }
}

async function sendRejectionEmail(user) {
    if (!resend) {
        console.warn('Resend not initialized. Skipping email notification.');
        return;
    }

    try {
        const logoUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/public/images/logo.jpg`;

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f43f5e 100%);
            color: #ffffff;
            padding: 40px 20px;
            text-align: center;
        }
        .header img {
            max-width: 280px;
            height: auto;
            margin-bottom: 10px;
            filter: brightness(0) invert(1);
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
            color: #333333;
        }
        .content h2 {
            background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 24px;
            margin-top: 0;
        }
        .content p {
            line-height: 1.6;
            font-size: 16px;
            margin: 15px 0;
        }
        .info-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%);
            border-left: 4px solid #fbbf24;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
            padding: 20px;
            text-align: center;
            color: #777777;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="${logoUrl}" alt="Paste2Earn Logo" />
        </div>
        <div class="content">
            <h2>Account Application Update</h2>
            <p>Hello ${user.username},</p>
            <p>Thank you for your interest in Paste2Earn. After careful review, we regret to inform you that your account application has not been approved at this time.</p>
            
            <div class="info-box">
                <p><strong>Common reasons for rejection:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>Invalid or incomplete Reddit profile</li>
                    <li>Newly created Reddit account</li>
                    <li>Insufficient account activity</li>
                    <li>Violation of platform guidelines</li>
                </ul>
            </div>

            <p>If you believe this decision was made in error, please contact our support team for clarification.</p>
            <p>Thank you for your understanding.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} Paste2Earn. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
        `;

        const { data, error } = await resend.emails.send({
            from: 'Paste2Earn <notifications@paste2earn.com>',
            to: [user.email],
            subject: 'Account Application Status - Paste2Earn',
            html: emailHtml
        });

        if (error) {
            console.error('❌ Failed to send rejection email:', error);
            return;
        }

        console.log(`✅ Rejection email sent to ${user.email} (ID: ${data.id})`);
    } catch (error) {
        console.error('❌ Error sending rejection email:', error.message);
    }
}

async function sendBanEmail(user) {
    if (!resend) return;

    try {
        const logoUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/public/images/logo.jpg`;

        const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #fee2e2; }
        .header { background: #dc2626; color: #fff; padding: 30px; text-align: center; }
        .content { padding: 40px; color: #374151; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>Account Blocked</h1></div>
        <div class="content">
            <h2>Hello ${user.username},</h2>
            <p>Your account on Paste2Earn has been <strong>blocked/banned</strong>. This usually occurs due to violations of our platform guidelines regarding task submissions or multiple account usage.</p>
            <p style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
                <strong>Notice:</strong> You can no longer claim tasks or withdraw funds.
            </p>
            <p>If you believe this was a mistake, please contact our support team or use the official support channel in Discord to submit an appeal.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Paste2Earn</p></div>
    </div>
</body>
</html>`;

        await resend.emails.send({
            from: 'Paste2Earn <notifications@paste2earn.com>',
            to: [user.email],
            subject: '⚠️ Important: Your Account has been Blocked',
            html: emailHtml
        });
        console.log(`✅ Ban email sent to ${user.email}`);
    } catch (err) {
        console.error('❌ Error sending ban email:', err.message);
    }
}

module.exports = {
    initializeResend,
    sendApprovalEmail,
    sendRejectionEmail,
    sendBanEmail
};
