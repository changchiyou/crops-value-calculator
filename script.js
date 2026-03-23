const defaultApiKey = "091bfd2c2e88957";
const apiKeyInput = document.getElementById("apiKeyInput");
const cropValueRatios = [
  { name: "小麥", ratio: 12 },
  { name: "玉米", ratio: 15 },
  { name: "南瓜", ratio: 18 },
  { name: "瓜果", ratio: 21 },
  { name: "藍贊提蒙", ratio: 24 },
];

const oreValueRatios = [
  { name: "緋紅鍛鐵錠", ratio: 16 },
  { name: "山銅錠", ratio: 19 },
  { name: "石化琥珀錠", ratio: 24 },
  { name: "鉍錠", ratio: 37 },
  { name: "維里西姆錠", ratio: 64 },
];

document.addEventListener("DOMContentLoaded", () => {
  const savedApiKey = localStorage.getItem("ocrApiKey");
  if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
  }

  // Initialize the table with default values
  calculateAllValues(new Array(5).fill(10000), new Array(5).fill(10000));

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

const pasteButton = document.getElementById("pasteButton");

async function pasteImage() {
  try {
    pasteButton.classList.add("processing");
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
        pasteButton.classList.remove("processing");
      };
    }

    if (!imageFound) {
      displayError("No image found in the clipboard.");
      pasteButton.classList.remove("processing");
    }
  } catch (err) {
    displayError("Failed to access clipboard: " + err.message);
    console.error("Failed to paste image:", err);
    pasteButton.classList.remove("processing");
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
      const lines = result.ParsedResults[0].TextOverlay?.Lines;
      if (lines && lines.length > 0) {
        // Sort lines by position: top-to-bottom, then left-to-right (Z-order)
        const sortedLines = lines.sort((a, b) => {
          const lineHeightThreshold = 20; // Lines within this Y distance are considered on same row
          const yDiff = a.MinTop - b.MinTop;

          // If lines are roughly on the same horizontal level
          if (Math.abs(yDiff) < lineHeightThreshold) {
            // Sort by X position (left to right)
            return a.MinLeft - b.MinLeft;
          }
          // Otherwise sort by Y position (top to bottom)
          return yDiff;
        });

        const extractedText = sortedLines.map(line => line.LineText).join(' ');
        parseAndCalculate(extractedText);
      } else {
        // Fallback to original method if no position data
        const extractedText = result.ParsedResults[0].ParsedText;
        parseAndCalculate(extractedText);
      }
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

  if (numericValues.length !== 11) {
    displayError(
      "Expected exactly 11 values (5 ores + 1 dust + 5 crops), but found " + numericValues.length,
      false,
      false,
    );
  } else {
    const ores = numericValues.slice(0, 5);  // 前 5 個是礦物
    // numericValues[5] 是粉塵，跳過
    const crops = numericValues.slice(6, 11); // 後 5 個是農作物
    calculateAllValues(crops, ores);
  }
}

function calculateAllValues(crops, ores) {
  let cropTotalValue = 0;
  let oreTotalValue = 0;
  let outputHTML = '<div class="section-title">農作物</div>';

  cropValueRatios.forEach((crop, index) => {
    const cropQuantity = crops[index] || 10000;
    const cropValue = cropQuantity * crop.ratio;
    outputHTML += `
      <div class="crop-item">
        <span class="crop-name">${crop.name}:</span>
        <input type="number" class="crop-quantity" value="${cropQuantity}" min="0" data-type="crop" data-index="${index}">
        <span class="crop-multiply">×</span>
        <input type="number" class="crop-ratio" value="${crop.ratio}" min="0" data-type="crop" data-index="${index}">
        <span class="crop-equal">=</span>
        <span class="crop-value">${cropValue.toLocaleString()}</span>
      </div>
    `;
    cropTotalValue += cropValue;
  });

  outputHTML += '<div class="section-title">礦物</div>';

  oreValueRatios.forEach((ore, index) => {
    const oreQuantity = ores[index] || 10000;
    const oreValue = oreQuantity * ore.ratio;
    outputHTML += `
      <div class="crop-item">
        <span class="crop-name">${ore.name}:</span>
        <input type="number" class="crop-quantity" value="${oreQuantity}" min="0" data-type="ore" data-index="${index}">
        <span class="crop-multiply">×</span>
        <input type="number" class="crop-ratio" value="${ore.ratio}" min="0" data-type="ore" data-index="${index}">
        <span class="crop-equal">=</span>
        <span class="crop-value">${oreValue.toLocaleString()}</span>
      </div>
    `;
    oreTotalValue += oreValue;
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
      if (index < 5) {
        const cropValue = crops[index] * cropValueRatios[index].ratio;
        el.textContent = `${cropValue.toLocaleString()}`;
      } else {
        const oreIndex = index - 5;
        const oreValue = ores[oreIndex] * oreValueRatios[oreIndex].ratio;
        el.textContent = `${oreValue.toLocaleString()}`;
      }
      el.style.opacity = "1";
    });

    result.innerHTML = `
      <div>農作物總價值: ${cropTotalValue.toLocaleString()}</div>
      <div>礦物總價值: ${oreTotalValue.toLocaleString()}</div>
      <div class="total-value">總計: ${(cropTotalValue + oreTotalValue).toLocaleString()}</div>
    `;
    result.style.opacity = "1";
  }, 500);

  // Add event listeners to the new input fields
  document.querySelectorAll(".crop-quantity, .crop-ratio").forEach((input) => {
    input.addEventListener("input", recalculate);
  });
}

function recalculate() {
  const cropItems = document.querySelectorAll(".crop-item");
  let cropTotalValue = 0;
  let oreTotalValue = 0;

  cropItems.forEach((item) => {
    const quantity = parseInt(item.querySelector(".crop-quantity").value) || 0;
    const ratio = parseInt(item.querySelector(".crop-ratio").value) || 0;
    const value = quantity * ratio;

    item.querySelector(".crop-value").textContent = `${value.toLocaleString()}`;

    const type = item.querySelector(".crop-quantity").getAttribute("data-type");
    if (type === "crop") {
      cropTotalValue += value;
    } else if (type === "ore") {
      oreTotalValue += value;
    }
  });

  const result = document.getElementById("result");
  result.innerHTML = `
    <div>農作物總價值: ${cropTotalValue.toLocaleString()}</div>
    <div>礦物總價值: ${oreTotalValue.toLocaleString()}</div>
    <div class="total-value">總計: ${(cropTotalValue + oreTotalValue).toLocaleString()}</div>
  `;
}

function displayError(message) {
  const result = document.getElementById("result");
  result.innerHTML = `<div class="error-message">${message}</div>`;
}

// Add event listener for the paste button
pasteButton.addEventListener("click", pasteImage);
