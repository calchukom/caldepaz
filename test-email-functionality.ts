import { sendReceiptEmail } from './src/middleware/googleMailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmailSender() {
    console.log('🔍 Testing Email Configuration...');

    // Check environment variables
    const emailSender = process.env.EMAIL_SENDER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    console.log(`Email Sender: ${emailSender ? 'Configured ✅' : 'Missing ❌'}`);
    console.log(`Email Password: ${emailPassword ? 'Configured ✅' : 'Missing ❌'}`);

    if (!emailSender || !emailPassword) {
        console.log('❌ Email configuration incomplete');
        return;
    }

    console.log('\n📧 Testing Email Sending...');

    const testEmailData = {
        to: 'calebogeto1@gmail.com', // Test email to same address
        subject: 'Test Email from CARLEB CALEB VEHICLE RENT - ' + new Date().toLocaleString(),
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">🚗 CARLEB CALEB VEHICLE RENT</h1>
                </div>
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
                    <h2 style="color: #2c3e50;">✅ Email Test Successful!</h2>
                    <p>This is a test email from your vehicle rental system.</p>
                    <div style="background-color: #ffffff; border-left: 4px solid #2c3e50; padding: 15px; margin: 20px 0;">
                        <p><strong>Test Details:</strong></p>
                        <ul>
                            <li>Timestamp: ${new Date().toLocaleString()}</li>
                            <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
                            <li>Email System: Production Ready ✅</li>
                            <li>Retry Logic: Enabled ✅</li>
                            <li>Timeout Protection: 2 minutes ✅</li>
                        </ul>
                    </div>
                    <p>Your email system is working correctly and ready for production use!</p>
                    <p>Best regards,<br/>CARLEB CALEB VEHICLE RENT Team</p>
                </div>
                <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
                    <p>&copy; ${new Date().getFullYear()} CARLEB CALEB VEHICLE RENT. All rights reserved.</p>
                </div>
            </div>
        `,
        text: 'Test email from CARLEB CALEB VEHICLE RENT - Email system working correctly!'
    };

    try {
        console.log('🚀 Sending test email...');
        const result = await sendReceiptEmail(testEmailData);

        if (result.success) {
            console.log('✅ Email sent successfully!');
            console.log(`📧 Message: ${result.message}`);
            console.log('🎉 Your email system is ready for production!');
        } else {
            console.log('❌ Email sending failed:');
            console.log(`Error: ${result.error}`);
            console.log(`Message: ${result.message}`);
        }
    } catch (error) {
        console.log('❌ Unexpected error:', (error as Error).message);
    }
}

// Run the test
testEmailSender().catch(console.error);
