#!/usr/bin/env node

/**
 * Fix Cloudinary Authentication Issues
 * This script provides solutions for the authentication token expiration problem
 */

const https = require("https");

const BASE_URL =
  "https://momanyicalebcarrent-awf5ffdbh8fnhca5.southafricanorth-01.azurewebsites.net";

// Test authentication with real credentials
async function testAuthentication() {
  console.log("=== Testing Authentication Flow ===\n");

  // Test with your actual admin credentials
  const testCredentials = [
    { email: "calebogeto1@gmail.com", password: "calebogeto1" },
    { email: "admin@carrent.com", password: "admin123" },
    { email: "admin@example.com", password: "admin123" },
  ];

  for (const creds of testCredentials) {
    console.log(`Testing credentials: ${creds.email}`);

    const postData = JSON.stringify(creds);

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
      console.log(`Response: ${response.statusCode}`);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);
        if (data.success && data.data && data.data.accessToken) {
          console.log("✅ Login successful!");
          console.log(`Token: ${data.data.accessToken.substring(0, 50)}...`);

          // Test the token with upload signature
          await testUploadSignature(data.data.accessToken);
          return data.data.accessToken;
        }
      }

      console.log(`Response body: ${response.body.substring(0, 200)}...\n`);
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }

  console.log(
    "❌ No valid credentials found. You may need to create an admin user first.\n"
  );
  return null;
}

async function testUploadSignature(token) {
  console.log("Testing upload signature with valid token...");

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
    console.log(`Upload signature response: ${response.statusCode}`);
    console.log(`Response: ${response.body.substring(0, 300)}...\n`);

    if (response.statusCode === 200) {
      console.log("✅ Upload signature endpoint working correctly!");
    }
  } catch (error) {
    console.log(`Upload signature error: ${error.message}\n`);
  }
}

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

// Generate Frontend Solution Code
function generateFrontendSolution() {
  console.log("=== Frontend Solution Code ===\n");

  console.log(`
// 1. TOKEN REFRESH UTILITY (utils/auth.js)
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // Check if token expires within the threshold
    return payload.exp && (payload.exp - currentTime) < (TOKEN_REFRESH_THRESHOLD / 1000);
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
};

export const refreshAuthToken = async () => {
  try {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      throw new Error('No token available');
    }
    
    const response = await fetch(
      '\${import.meta.env.VITE_API_BASE_URL}/auth/refresh',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${currentToken}\`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data.accessToken) {
        localStorage.setItem('token', data.data.accessToken);
        return data.data.accessToken;
      }
    }
    
    throw new Error('Token refresh failed');
  } catch (error) {
    console.error('Token refresh error:', error);
    // Redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw error;
  }
};

// 2. ENHANCED CLOUDINARY UPLOAD HOOK (useCloudinaryUpload.ts)
export const useCloudinaryUpload = () => {
  const uploadImages = async (files, vehicleId, is360 = false) => {
    try {
      // Check token expiry before upload
      let token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      if (isTokenExpired(token)) {
        console.log('Token expired, refreshing...');
        token = await refreshAuthToken();
      }
      
      // Get upload signature with fresh token
      const signatureResponse = await fetch(
        \`\${import.meta.env.VITE_API_BASE_URL}/vehicle-images/upload-signature\`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({ vehicleId, is360 })
        }
      );
      
      if (!signatureResponse.ok) {
        if (signatureResponse.status === 401 || signatureResponse.status === 403) {
          // Try refreshing token once more
          token = await refreshAuthToken();
          
          const retryResponse = await fetch(
            \`\${import.meta.env.VITE_API_BASE_URL}/vehicle-images/upload-signature\`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${token}\`
              },
              body: JSON.stringify({ vehicleId, is360 })
            }
          );
          
          if (!retryResponse.ok) {
            throw new Error('Authentication failed after token refresh');
          }
          
          const retryData = await retryResponse.json();
          return await uploadToCloudinary(files, retryData.data);
        }
        
        throw new Error(\`Failed to get upload signature: \${signatureResponse.status}\`);
      }
      
      const signatureData = await signatureResponse.json();
      return await uploadToCloudinary(files, signatureData.data);
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };
  
  const uploadToCloudinary = async (files, signatureData) => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signatureData.signature);
      formData.append('timestamp', signatureData.timestamp);
      formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      
      const response = await fetch(
        \`https://api.cloudinary.com/v1_1/\${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload\`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error(\`Cloudinary upload failed: \${response.status}\`);
      }
      
      return await response.json();
    });
    
    return await Promise.all(uploadPromises);
  };
  
  return { uploadImages };
};

// 3. AUTOMATIC TOKEN REFRESH INTERCEPTOR
export const setupTokenInterceptor = () => {
  // Check token every 30 seconds
  setInterval(async () => {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      try {
        await refreshAuthToken();
        console.log('Token automatically refreshed');
      } catch (error) {
        console.log('Automatic token refresh failed');
      }
    }
  }, 30000);
};

// 4. APP INITIALIZATION (App.jsx)
useEffect(() => {
  setupTokenInterceptor();
}, []);
`);

  console.log("\n=== Quick Fix for Current Issue ===\n");
  console.log(`
// IMMEDIATE FIX: Add this to your VehicleImageManager component

useEffect(() => {
  const checkAndRefreshToken = async () => {
    const token = localStorage.getItem('token');
    if (!token || isTokenExpired(token)) {
      try {
        await refreshAuthToken();
      } catch (error) {
        // Redirect to login if refresh fails
        window.location.href = '/login';
      }
    }
  };
  
  checkAndRefreshToken();
}, []);
`);
}

// Main execution
async function main() {
  console.log("🔧 Cloudinary Authentication Fix Tool\n");

  const validToken = await testAuthentication();

  if (validToken) {
    console.log("✅ Backend authentication is working correctly!");
    console.log("The issue is token expiration in your frontend.\n");
  } else {
    console.log("❌ Need to create admin user first.\n");
    console.log("Create admin user with this endpoint:");
    console.log("POST /api/auth/register");
    console.log(
      'Body: {"email": "admin@example.com", "password": "admin123", "role": "admin"}\n'
    );
  }

  generateFrontendSolution();

  console.log("\n🎯 Next Steps:");
  console.log(
    "1. Update your useCloudinaryUpload hook with the enhanced version above"
  );
  console.log("2. Add token refresh logic to your authentication utilities");
  console.log("3. Set up automatic token refresh in your app");
  console.log("4. If no admin user exists, create one using the backend API");
}

main().catch(console.error);
