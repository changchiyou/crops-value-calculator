const defaultApiKey = "091bfd2c2e88957";
const apiKeyInput = document.getElementById("apiKeyInput");
const cropValueRatios = [
    { name: "Wheat", ratio: 12 },
    { name: "Corn", ratio: 15 },
    { name: "Pumpkin", ratio: 18 },
    { name: "Orgourd", ratio: 21 },
    { name: "Blue Zanthimum", ratio: 24 },
];

// Load saved API key on page load
document.addEventListener("DOMContentLoaded", () => {
    const savedApiKey = localStorage.getItem("ocrApiKey");
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
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
            resetRatiosToDefault();  // Reset ratios before parsing new text
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
            false
        );
        return;
    }

    calculateCropValue(numericValues);
}

function calculateCropValue(crops) {
    let totalValue = 0;
    let outputHTML = "";

    crops.forEach((cropQuantity, index) => {
        const { name, ratio } = cropValueRatios[index];
        const cropValue = cropQuantity * ratio;
        outputHTML += `
            <div class="crop-item">
                <span class="crop-name">${name}:</span>
                <input type="number" class="crop-quantity" value="${cropQuantity}" min="0">
                <span class="crop-multiply">×</span>
                <input type="number" class="crop-ratio" value="${ratio}" min="0">
                <span class="crop-value">= ${cropValue.toLocaleString()}</span>
            </div>
        `;
        totalValue += cropValue;
    });

    const output = document.getElementById("output");
    output.innerHTML = outputHTML;
    output.style.opacity = "0";

    const result = document.getElementById("result");
    result.textContent = `Total value: ${totalValue.toLocaleString()}`;
    result.style.opacity = "0";

    setTimeout(() => {
        output.style.transition = "opacity 0.5s ease-in-out";
        result.style.transition = "opacity 0.5s ease-in-out";
        output.style.opacity = "1";
        result.style.opacity = "1";
    }, 100);

    // Add event listeners to the new input fields
    document.querySelectorAll('.crop-quantity, .crop-ratio').forEach(input => {
        input.addEventListener('input', recalculate);
    });
}

function recalculate() {
    const cropItems = document.querySelectorAll('.crop-item');
    let totalValue = 0;

    cropItems.forEach((item, index) => {
        const quantity = parseInt(item.querySelector('.crop-quantity').value) || 0;
        const ratio = parseInt(item.querySelector('.crop-ratio').value) || 0;
        const cropValue = quantity * ratio;

        item.querySelector('.crop-value').textContent = `= ${cropValue.toLocaleString()}`;
        totalValue += cropValue;
    });

    const result = document.getElementById("result");
    result.textContent = `Total value: ${totalValue.toLocaleString()}`;
}

function displayError(message, clearResult = true, clearImage = true) {
    const output = document.getElementById("output");
    output.innerHTML = `<div class="error-message">${message}</div>`;
    output.style.opacity = "0";

    setTimeout(() => {
        output.style.transition = "opacity 0.5s ease-in-out";
        output.style.opacity = "1";
    }, 100);

    if (clearResult) {
        document.getElementById("result").textContent = "";
    }

    if (clearImage) {
        document.getElementById("imageContainer").innerHTML = "";
    }
}

function resetRatiosToDefault() {
    cropValueRatios.forEach((crop, index) => {
        crop.ratio = cropValueRatios[index].ratio;
    });
}