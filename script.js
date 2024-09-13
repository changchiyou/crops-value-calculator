const defaultApiKey = "091bfd2c2e88957";
const apiKeyInput = document.getElementById("apiKeyInput");
const cropValueRatios = [
  { name: "Wheat", ratio: 12 },
  { name: "Corn", ratio: 15 },
  { name: "Pumpkin", ratio: 18 },
  { name: "Orgourd", ratio: 21 },
  { name: "Blue Zanthimum", ratio: 24 },
];

document.addEventListener("DOMContentLoaded", () => {
  const savedApiKey = localStorage.getItem("ocrApiKey");
  if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
  }

  // Initialize the table with default values
  calculateCropValue(new Array(5).fill(10000));

  const imageLink = document.querySelector(".image-link");
  const imagePreview = document.getElementById("imagePreview");

  imageLink.addEventListener("mouseover", function (e) {
    const imageUrl = this.getAttribute("data-image");
    imagePreview.innerHTML = `<img src="${imageUrl}" alt="Preview">`;
    imagePreview.style.display = "block";

    // Position the preview near the cursor
    imagePreview.style.left = e.pageX + 10 + "px";
    imagePreview.style.top = e.pageY + 10 + "px";
  });

  imageLink.addEventListener("mouseout", function () {
    imagePreview.style.display = "none";
  });

  imageLink.addEventListener("mousemove", function (e) {
    // Update position as the mouse moves
    imagePreview.style.left = e.pageX + 10 + "px";
    imagePreview.style.top = e.pageY + 10 + "px";
  });

  // Prevent default action when clicking the link
  imageLink.addEventListener("click", function (e) {
    e.preventDefault();
    const imageUrl = this.getAttribute("data-image");
    window.open(imageUrl, "_blank");
  });
});

// Save API key when input changes
apiKeyInput.addEventListener("change", () => {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    localStorage.setItem("ocrApiKey", apiKey);
  } else {
    localStorage.removeItem("ocrApiKey");
  }
});

async function pasteImage() {
  try {
    const items = await navigator.clipboard.read();
    let imageFound = false;

    for (const item of items) {
      if (!item.types.includes("image/png")) continue;
      imageFound = true;
      const blob = await item.getType("image/png");
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = async function () {
        const base64Image = reader.result.split(",")[1];
        showPastedImage(reader.result);
        await extractTextFromImage(base64Image);
      };
    }

    if (!imageFound) {
      displayError("No image found in the clipboard.");
    }
  } catch (err) {
    displayError("Failed to access clipboard: " + err.message);
    console.error("Failed to paste image:", err);
  }
}

function showPastedImage(imageDataUrl) {
  const imageContainer = document.getElementById("imageContainer");
  imageContainer.innerHTML = "";

  const imgElement = document.createElement("img");
  imgElement.src = imageDataUrl;
  imgElement.style.opacity = "0";
  imageContainer.appendChild(imgElement);

  setTimeout(() => {
    imgElement.style.transition = "opacity 0.5s ease-in-out";
    imgElement.style.opacity = "1";
  }, 100);
}

async function extractTextFromImage(base64Image) {
  const apiKey = apiKeyInput.value.trim() || defaultApiKey;
  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append("base64Image", "data:image/png;base64," + base64Image);
  formData.append("OCREngine", "2");

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const extractedText = result.ParsedResults[0].ParsedText;
      parseAndCalculate(extractedText);
    } else {
      throw new Error("Failed to extract text from image.");
    }
  } catch (err) {
    displayError("OCR failed: " + err.message);
    console.error("OCR failed:", err);
  }
}

function parseAndCalculate(text) {
  const numericValues = [];
  const words = text.split(/\s+/);

  words.forEach((word) => {
    const number = word.replace(/[^0-9]/g, "");
    if (number) numericValues.push(parseInt(number));
  });

  if (numericValues.length !== 5) {
    displayError(
      "Expected exactly 5 crop values, but found " + numericValues.length,
      false,
      false,
    );
  } else {
    calculateCropValue(numericValues);
  }
}

function calculateCropValue(crops) {
  let totalValue = 0;
  let outputHTML = "";

  cropValueRatios.forEach((crop, index) => {
    const cropQuantity = crops[index] || 10000; // Use 10000 as default if no value provided
    const cropValue = cropQuantity * crop.ratio;
    outputHTML += `
      <div class="crop-item">
        <span class="crop-name">${crop.name}:</span>
        <input type="number" class="crop-quantity" value="${cropQuantity}" min="0">
        <span class="crop-multiply">×</span>
        <input type="number" class="crop-ratio" value="${crop.ratio}" min="0">
        <span class="crop-equal">=</span>
        <span class="crop-value">${cropValue.toLocaleString()}</span>
      </div>
    `;
    totalValue += cropValue;
  });

  const output = document.getElementById("output");
  output.innerHTML = outputHTML;

  const result = document.getElementById("result");

  // First, fade out the crop values and result
  document.querySelectorAll(".crop-value").forEach((el) => {
    el.style.transition = "opacity 0.5s ease-in-out";
    el.style.opacity = "0";
  });
  result.style.transition = "opacity 0.5s ease-in-out";
  result.style.opacity = "0";

  // Wait for the fade-out transition to complete before updating the content
  setTimeout(() => {
    // Update the crop values and result content after fade-out
    document.querySelectorAll(".crop-value").forEach((el, index) => {
      const cropValue = crops[index] * cropValueRatios[index].ratio;
      el.textContent = `${cropValue.toLocaleString()}`;
      el.style.opacity = "1"; // Fade back in
    });

    result.textContent = `Total value: ${totalValue.toLocaleString()}`;
    result.style.opacity = "1"; // Fade back in
  }, 500); // Wait for the fade-out to finish

  // Add event listeners to the new input fields
  document.querySelectorAll(".crop-quantity, .crop-ratio").forEach((input) => {
    input.addEventListener("input", recalculate);
  });
}

function recalculate() {
  const cropItems = document.querySelectorAll(".crop-item");
  let totalValue = 0;

  cropItems.forEach((item) => {
    const quantity = parseInt(item.querySelector(".crop-quantity").value) || 0;
    const ratio = parseInt(item.querySelector(".crop-ratio").value) || 0;
    const cropValue = quantity * ratio;

    item.querySelector(".crop-value").textContent =
      `${cropValue.toLocaleString()}`;
    totalValue += cropValue;
  });

  const result = document.getElementById("result");
  result.textContent = `Total value: ${totalValue.toLocaleString()}`;
}

function displayError(message) {
  const result = document.getElementById("result");
  result.innerHTML = `<div class="error-message">${message}</div>`;
}

// Add event listener for the paste button
document.getElementById("pasteButton").addEventListener("click", pasteImage);

// Save API key when input changes
apiKeyInput.addEventListener("change", () => {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    localStorage.setItem("ocrApiKey", apiKey);
  } else {
    localStorage.removeItem("ocrApiKey");
  }
});
