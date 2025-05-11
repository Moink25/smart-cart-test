const fs = require("fs");
const path = require("path");

// Test directory creation and file writing
function testFileOperations() {
  try {
    console.log("Starting file operation test");
    console.log("Current directory:", __dirname);

    // Test public directory
    const publicDir = path.join(__dirname, "public");
    console.log("Public directory path:", publicDir);

    if (!fs.existsSync(publicDir)) {
      console.log("Creating public directory");
      try {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log("Public directory created at:", publicDir);
      } catch (err) {
        console.error("Error creating public directory:", err);
        return;
      }
    } else {
      console.log("Public directory already exists at:", publicDir);
    }

    // Test images directory
    const imagesDir = path.join(publicDir, "images");
    console.log("Images directory path:", imagesDir);

    if (!fs.existsSync(imagesDir)) {
      console.log("Creating images directory");
      try {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log("Images directory created at:", imagesDir);
      } catch (err) {
        console.error("Error creating images directory:", err);
        return;
      }
    } else {
      console.log("Images directory already exists at:", imagesDir);
    }

    // Test writing a file
    const testFilePath = path.join(imagesDir, "test-file.txt");
    console.log("Writing test file to:", testFilePath);
    try {
      fs.writeFileSync(
        testFilePath,
        "This is a test file created at " + new Date().toString()
      );
      console.log("Test file written successfully");
    } catch (err) {
      console.error("Error writing test file:", err);
      return;
    }

    // Check if the file exists
    if (fs.existsSync(testFilePath)) {
      console.log("Test file exists at:", testFilePath);
      try {
        console.log("File content:", fs.readFileSync(testFilePath, "utf8"));
      } catch (err) {
        console.error("Error reading test file:", err);
      }
    } else {
      console.error("Failed to create test file!");
    }

    // Test permissions
    try {
      const stats = fs.statSync(imagesDir);
      console.log("Images directory permissions:", stats.mode.toString(8));
      console.log("Images directory is writable:", Boolean(stats.mode & 0o200)); // Check write permission
    } catch (err) {
      console.error("Error checking directory permissions:", err);
    }

    // List directory contents
    try {
      console.log("Images directory contains:");
      const files = fs.readdirSync(imagesDir);
      if (files.length === 0) {
        console.log(" (empty directory)");
      } else {
        files.forEach((file) => {
          console.log(" - " + file);
        });
      }
    } catch (err) {
      console.error("Error listing directory contents:", err);
    }

    console.log("File operation test completed successfully");
  } catch (error) {
    console.error("Error during file operation test:", error);
  }
}

// Run the test
testFileOperations();
