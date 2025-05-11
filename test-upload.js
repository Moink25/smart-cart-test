const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");

// Function to test upload
async function testUpload() {
  try {
    // Set up test parameters
    const productId = "1"; // Test with product ID 1
    const token = "YOUR_AUTH_TOKEN"; // Replace with an actual token
    const imageFilePath = path.join(
      __dirname,
      "public",
      "images",
      "product-placeholder.jpg"
    );

    // Verify the image exists
    if (!fs.existsSync(imageFilePath)) {
      console.error("Test image not found at:", imageFilePath);
      return;
    }

    console.log("Using test image:", imageFilePath);

    // Create form data for the upload
    const form = new FormData();
    form.append("image", fs.createReadStream(imageFilePath));

    // Set up the API URL
    const API_URL = "http://localhost:5000/api";
    const uploadUrl = `${API_URL}/products/upload-image/${productId}`;

    console.log("Sending request to:", uploadUrl);

    // Make the request
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    // Check response
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to parse error response" }));
      throw new Error(
        `Upload failed with status ${response.status}: ${
          errorData.message || "Unknown error"
        }`
      );
    }

    const result = await response.json();
    console.log("Upload successful:", result);
  } catch (error) {
    console.error("Error testing upload:", error);
  }
}

// Run the test
console.log("Starting upload test...");
testUpload();
