/**
 * Frontend Authentication Fix for Cloudinary Uploads
 * Copy these functions to your frontend project
 */

// 1. TOKEN UTILITIES (utils/auth.js or utils/auth.ts)
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;

    // Check if token expires within the threshold
    return (
      payload.exp && payload.exp - currentTime < TOKEN_REFRESH_THRESHOLD / 1000
    );
  } catch (error) {
    console.error("Error checking token expiry:", error);
    return true;
  }
};

export const getValidToken = async () => {
  try {
    let token = localStorage.getItem("token");

    if (!token) {
      throw new Error("No token available");
    }

    // If token is expired or about to expire, try to get a fresh one
    if (isTokenExpired(token)) {
      console.log("Token expired, need fresh login...");

      // For now, redirect to login
      // In a production app, you might implement refresh token logic
      localStorage.removeItem("token");
      window.location.href = "/login";
      throw new Error(
        "Authentication expired. Please refresh the page and try again."
      );
    }

    return token;
  } catch (error) {
    console.error("Token validation error:", error);
    throw error;
  }
};

// 2. ENHANCED CLOUDINARY UPLOAD HOOK
export const useCloudinaryUploadFixed = () => {
  const uploadImages = async (files, vehicleId, is360 = false) => {
    try {
      console.log("Starting upload process...");

      // Get a valid token
      const token = await getValidToken();

      console.log("Getting upload signature...");

      // Get upload signature with fresh token
      const signatureResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/vehicle-images/upload-signature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ vehicleId, is360 }),
        }
      );

      if (!signatureResponse.ok) {
        const errorText = await signatureResponse.text();
        console.error(
          "Signature response error:",
          signatureResponse.status,
          errorText
        );

        if (
          signatureResponse.status === 401 ||
          signatureResponse.status === 403
        ) {
          throw new Error(
            "Authentication expired. Please refresh the page and try again."
          );
        }

        throw new Error(
          `Failed to get upload signature: ${signatureResponse.status} - ${errorText}`
        );
      }

      const signatureData = await signatureResponse.json();
      console.log("Upload signature received successfully");

      return await uploadToCloudinary(files, signatureData.data);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      throw error;
    }
  };

  const uploadToCloudinary = async (files, signatureData) => {
    console.log(`Uploading ${files.length} files to Cloudinary...`);

    const uploadPromises = files.map(async (file, index) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signatureData.signature);
      formData.append("timestamp", signatureData.timestamp);
      formData.append("api_key", import.meta.env.VITE_CLOUDINARY_API_KEY);
      formData.append(
        "upload_preset",
        import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
      );

      console.log(`Uploading file ${index + 1}/${files.length}...`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
        }/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Cloudinary upload error for file ${index + 1}:`,
          response.status,
          errorText
        );
        throw new Error(
          `Cloudinary upload failed for file ${index + 1}: ${
            response.status
          } - ${errorText}`
        );
      }

      const result = await response.json();
      console.log(
        `✅ File ${index + 1} uploaded successfully:`,
        result.public_id
      );
      return result;
    });

    const results = await Promise.all(uploadPromises);
    console.log(`✅ All ${files.length} files uploaded successfully`);
    return results;
  };

  return { uploadImages };
};

// 3. LOGIN UTILITY TO GET FRESH TOKEN
export const loginAndGetToken = async (
  email = "calebogeto1@gmail.com",
  password = "calebogeto1"
) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data && data.data.accessToken) {
      localStorage.setItem("token", data.data.accessToken);
      console.log("✅ Successfully logged in and token stored");
      return data.data.accessToken;
    } else {
      throw new Error("Invalid login response");
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// 4. QUICK FIX COMPONENT
export const QuickAuthFix = () => {
  const handleRefreshAuth = async () => {
    try {
      await loginAndGetToken();
      alert("Authentication refreshed! You can now upload images.");
      window.location.reload();
    } catch (error) {
      alert(`Failed to refresh authentication: ${error.message}`);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "#f0f0f0",
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "5px",
        zIndex: 9999,
      }}
    >
      <button
        onClick={handleRefreshAuth}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        🔄 Refresh Auth
      </button>
    </div>
  );
};

console.log(`
🎯 IMPLEMENTATION STEPS:

1. **Immediate Fix**: Add the QuickAuthFix component to your VehicleImageManager page:
   import { QuickAuthFix } from './frontend-auth-fix';
   
   // In your render method:
   return (
     <div>
       <QuickAuthFix />
       {/* your existing components */}
     </div>
   );

2. **Replace your useCloudinaryUpload hook** with useCloudinaryUploadFixed

3. **Test the fix**:
   - Click "🔄 Refresh Auth" button when you get authentication errors
   - Try uploading images again

4. **Long-term solution**: Implement automatic token refresh in your app initialization
`);
