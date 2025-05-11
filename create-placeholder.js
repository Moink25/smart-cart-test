const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

// Create a 400x300 placeholder image
const width = 400;
const height = 300;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Fill background
ctx.fillStyle = "#cccccc";
ctx.fillRect(0, 0, width, height);

// Add text
ctx.font = "bold 40px sans-serif";
ctx.fillStyle = "#333333";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("No Image", width / 2, height / 2);

// Save the image
const buffer = canvas.toBuffer("image/jpeg");
const outputPath = path.join(
  __dirname,
  "public",
  "images",
  "product-placeholder.jpg"
);

fs.writeFileSync(outputPath, buffer);
console.log(`Placeholder image saved to ${outputPath}`);
