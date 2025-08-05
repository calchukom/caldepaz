#!/usr/bin/env node

// Quick Email Test Script
import { sendEmail, EmailTemplate } from "./src/middleware/googleMailer.js";

async function testEmailConfiguration() {
  console.log("🧪 Testing Email Configuration...\n");

  // Check environment variables
  console.log("📋 Environment Check:");
  console.log(
    `EMAIL_SENDER: ${process.env.EMAIL_SENDER ? "✅ Set" : "❌ Not set"}`
  );
  console.log(
    `EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? "✅ Set" : "❌ Not set"}`
  );
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "not set"}\n`);

  if (!process.env.EMAIL_SENDER || !process.env.EMAIL_PASSWORD) {
    console.log(
      "❌ Email configuration is incomplete. Please check your .env file."
    );
    process.exit(1);
  }

  // Test email sending
  console.log("📧 Testing Email Sending...");

  const testEmailRequest = {
    to: "calebogeto1@gmail.com", // Send to yourself for testing
    subject: "Vehicle Rental System - Email Test",
    template: EmailTemplate.GENERIC,
    data: {
      firstName: "Test User",
      customMessage:
        "This is a test email from your Vehicle Rental System. If you receive this, your email configuration is working correctly!",
    },
  };

  try {
    const result = await sendEmail(testEmailRequest);

    if (result.success) {
      console.log("✅ Email sent successfully!");
      console.log(`📬 Check your inbox: ${testEmailRequest.to}`);
      console.log(`📝 Subject: ${testEmailRequest.subject}\n`);

      console.log("🎉 Email configuration is working correctly!");
      console.log("🚀 Ready for production deployment on Azure.");
    } else {
      console.log("❌ Email sending failed:");
      console.log(`Error: ${result.message}`);
      console.log(`Details: ${result.error}`);
    }
  } catch (error) {
    console.log("❌ Email test failed with error:");
    console.log(error);
  }
}

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

// Run the test
testEmailConfiguration();
