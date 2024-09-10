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

        // Display the pasted image
        showPastedImage(reader.result);

        // Extract text from the image
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
  imageContainer.innerHTML = ""; // Clear previous image

  const imgElement = document.createElement("img");
  imgElement.src = imageDataUrl;
  imageContainer.appendChild(imgElement);
}

async function extractTextFromImage(base64Image) {
  const apiKey = "091bfd2c2e88957"; // Your API key here
  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append("base64Image", "data:image/png;base64," + base64Image);
  formData.append("OCREngine", "2"); // Better accuracy for text in image

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
      "Expected exactly 5 crop values, but found " + numericValues.length + ".",
      true,
      false,
    );
    return;
  }

  calculateCropValue(numericValues);
}

function calculateCropValue(crops) {
  const cropValueRatios = [
    { name: "Wheat", ratio: 12 },
    { name: "Corn", ratio: 15 },
    { name: "Pumpkin", ratio: 18 },
    { name: "Orgourd", ratio: 21 },
    { name: "Blue Zanthimum", ratio: 24 },
  ];

  let totalValue = 0;
  let outputHTML = "";

  crops.forEach((cropQuantity, index) => {
    const { name, ratio } = cropValueRatios[index];
    const cropValue = cropQuantity * ratio;
    outputHTML += `<div>${name}: ${cropQuantity} x ${ratio} = ${cropValue.toLocaleString()}</div>`;
    totalValue += cropValue;
  });

  document.getElementById("output").innerHTML = outputHTML;
  document.getElementById("result").textContent =
    `Total value: ${totalValue.toLocaleString()}`;
}

function displayError(message, clearResult = true, clearImage = true) {
  document.getElementById("output").innerHTML =
    `<div style="color: red;">${message}</div>`;

  if (clearResult) {
    document.getElementById("result").textContent = ""; // Clear any previous result
  }

  if (clearImage) {
    document.getElementById("imageContainer").innerHTML = ""; // Clear any previous image
  }
}
