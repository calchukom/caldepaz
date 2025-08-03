#!/usr/bin/env node

/**
 * Quick Authentication Test for Your Specific Credentials
 */

const https = require("https");

const testYourCredentials = async () => {
  console.log("🔐 Testing Your Admin Credentials...\n");

  const credentials = {
    email: "calebogeto1@gmail.com",
    password: "calebogeto1",
  };

  const postData = JSON.stringify(credentials);

  const options = {
    hostname:
      "momanyicalebcarrent-awf5ffdbh8fnhca5.southafricanorth-01.azurewebsites.net",
    port: 443,
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  try {
    const response = await makeRequest(options, postData);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);

      if (data.success && data.data && data.data.accessToken) {
        console.log("✅ Login successful!");
        console.log(`📧 Email: ${credentials.email}`);
        console.log(`🔑 Token: ${data.data.accessToken.substring(0, 50)}...`);
        console.log(
          `👤 User Role: ${data.data.user ? data.data.user.role : "Unknown"}`
        );

        // Test token immediately with upload signature
        await testUploadSignature(data.data.accessToken);

        console.log("\n🎯 SOLUTION FOR YOUR FRONTEND:");
        console.log("1. Use the frontend-auth-fix.js code I created");
        console.log(
          '2. When you get "Authentication expired" error, run this:'
        );
        console.log(`
   // In your browser console or component:
   localStorage.setItem('token', '${data.data.accessToken}');
   
   // Then try uploading again
        `);

        return data.data.accessToken;
      }
    }

    console.log("❌ Login failed");
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  return null;
};

const testUploadSignature = async (token) => {
  console.log("\n🧪 Testing upload signature with your token...");

  const postData = JSON.stringify({
    vehicleId: "550e8400-e29b-41d4-a716-446655440000",
    is360: false,
  });

  const options = {
    hostname:
      "momanyicalebcarrent-awf5ffdbh8fnhca5.southafricanorth-01.azurewebsites.net",
    port: 443,
    path: "/api/vehicle-images/upload-signature",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await makeRequest(options, postData);

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log("✅ Upload signature generated successfully!");
      console.log(`📝 Signature: ${data.data.signature.substring(0, 20)}...`);
      console.log(`⏰ Timestamp: ${data.data.timestamp}`);
      console.log(
        "🎉 Your backend is working perfectly for Cloudinary uploads!"
      );
    } else {
      console.log(`❌ Upload signature failed: ${response.statusCode}`);
      console.log(`Response: ${response.body}`);
    }
  } catch (error) {
    console.error("❌ Upload signature error:", error.message);
  }
};

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

// Run the test
testYourCredentials();
