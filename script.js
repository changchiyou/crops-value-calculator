const defaultApiKey = "091bfd2c2e88957";
const CROP_VALUE_PER_HOUR = 136080;
const apiKeyInput = document.getElementById("apiKeyInput");

const i18n = {
  zh: {
    title: "金司馬船運計算機",
    heading: "金司馬船運計算機",
    description: "從剪貼版貼上圖片以提取農作物與礦物數量並計算總價值。",
    pasteButton: "貼上圖片",
    processing: "正在處理",
    apiKeyPlaceholder: "(非必要) 你的 OCR.SPACE API 金鑰",
    freeKey: "註冊免費金鑰",
    oreSection: "礦物",
    cropSection: "農作物",
    miningSection: "⛏ 預估完成時間",
    cropTotal: "農作物總價值",
    oreTotal: "礦物總價值",
    grandTotal: "總價值",
    miningTotal: "預估全部冶煉完成",
    projectedTotal: "冶煉完成後總價值",
    currentCard: "當前",
    projectedCard: "冶煉完畢",
    cropGain: "農作物增值",
    oreGain: "礦物增幅",
    eta: "預估完成",
    minedPrefix: "已挖",
    toMinePrefix: "待挖",
    totalPrefix: "共",
    noImage: "剪貼簿中沒有找到圖片。",
    clipboardFail: "無法存取剪貼簿：",
    ocrFail: "OCR 失敗：",
    ocrParseFail: "無法從圖片中提取文字。",
    parseErrorNew: "無法解析 Mined Ore 區段，請確認截圖格式。",
    parseCropFail: "無法解析 Crops 區段，請確認截圖格式。",
    parseCountError: (found) => `預期 11 個數值，但找到 ${found} 個。順序：緋紅鍛鐵錠、山銅錠、石化琥珀錠、粉塵、小麥、玉米、南瓜、鉍錠、維里西姆錠、瓜果、藍贊提蒙`,
    oreNames: ["緋紅鍛鐵錠", "山銅錠", "石化琥珀錠", "鉍錠", "維里西姆錠"],
    cropNames: ["小麥", "玉米", "南瓜", "瓜果", "藍贊提蒙"],
  },
  en: {
    title: "Kingsmarch Shipping Calculator",
    heading: "Kingsmarch Shipping Calculator",
    description: "Paste a screenshot to extract crop & ore quantities and calculate total value.",
    pasteButton: "Paste Image",
    processing: "Processing",
    apiKeyPlaceholder: "(Optional) Your OCR.SPACE API key",
    freeKey: "Get a free key",
    oreSection: "Smelted Bars",
    cropSection: "Crops",
    miningSection: "⛏ Estimated Completion",
    cropTotal: "Crops Total",
    oreTotal: "Bars Total",
    grandTotal: "Grand Total",
    miningTotal: "Est. all smelting done",
    projectedTotal: "Projected total after smelting",
    currentCard: "Current",
    projectedCard: "After Smelting",
    cropGain: "Crop gain",
    oreGain: "Ore gain",
    eta: "ETA",
    minedPrefix: "mined",
    toMinePrefix: "to mine",
    totalPrefix: "total",
    noImage: "No image found in the clipboard.",
    clipboardFail: "Failed to access clipboard: ",
    ocrFail: "OCR failed: ",
    ocrParseFail: "Failed to extract text from image.",
    parseErrorNew: "Failed to parse Mined Ore section. Please check the screenshot format.",
    parseCropFail: "Failed to parse Crops section. Please check the screenshot format.",
    parseCountError: (found) => `Expected 11 values, but found ${found}. Order: Crimson Iron, Orichalcum, Petrified Amber, Dust, Wheat, Corn, Pumpkin, Bismuth, Verisium, Gourds, Blue Zanthemum`,
    oreNames: ["Crimson Iron Bar", "Orichalcum Bar", "Petrified Amber Bar", "Bismuth Bar", "Verisium Bar"],
    cropNames: ["Wheat", "Corn", "Pumpkin", "Gourd", "Blue Zanthemum"],
  },
};

let currentLang = localStorage.getItem("lang") || "zh";

function t(key, ...args) {
  const val = i18n[currentLang][key];
  return typeof val === "function" ? val(...args) : val;
}

function applyI18n() {
  document.documentElement.lang = currentLang === "zh" ? "zh-TW" : "en";
  document.title = t("title");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });

  document.getElementById("langToggle").textContent = currentLang === "zh" ? "EN" : "中文";

  const giscusFrame = document.querySelector("iframe.giscus-frame");
  if (giscusFrame) {
    giscusFrame.contentWindow.postMessage(
      { giscus: { setConfig: { lang: currentLang === "zh" ? "zh-TW" : "en" } } },
      "https://giscus.app"
    );
  }
}

const cropValueRatios = [
  { ratio: 12 },
  { ratio: 15 },
  { ratio: 18 },
  { ratio: 21 },
  { ratio: 24 },
];

const oreValueRatios = [
  { ratio: 16 },
  { ratio: 22 },
  { ratio: 30 },
  { ratio: 50 },
  { ratio: 90 },
];

// 冶煉速率 = 挖掘速率 / 2
const oreMiningRates = [22680, 18768, 15120, 9720, 5670];

document.addEventListener("DOMContentLoaded", () => {
  const savedApiKey = localStorage.getItem("ocrApiKey");
  if (savedApiKey) {
    apiKeyInput.value = savedApiKey;
  }

  applyI18n();
  calculateAllValues(new Array(5).fill(10000), new Array(5).fill(10000));

  document.getElementById("langToggle").addEventListener("click", () => {
    currentLang = currentLang === "zh" ? "en" : "zh";
    localStorage.setItem("lang", currentLang);
    applyI18n();
    calculateAllValues(new Array(5).fill(10000), new Array(5).fill(10000));
  });
});

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
      displayError(t("noImage"));
      pasteButton.classList.remove("processing");
    }
  } catch (err) {
    displayError(t("clipboardFail") + err.message);
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
  formData.append("isOverlayRequired", "true");

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const parsed = result.ParsedResults[0];
      const extractedText = parsed.ParsedText;
      const lines = parsed.TextOverlay?.Lines || [];
      parseAndCalculate(extractedText, lines);
    } else {
      throw new Error(t("ocrParseFail"));
    }
  } catch (err) {
    displayError(t("ocrFail") + err.message);
    console.error("OCR failed:", err);
  }
}

// 用座標解析 Mined Ore / Ore to Mine 區段，回傳各 5 種礦的 [mined, toMine]
function parseMinedOreSection(lines) {
  // 找出 "Mined Ore" 和 "Smelted Bars" 的 Top 位置作為區段邊界
  let sectionStart = null;
  let sectionEnd = null;

  for (const line of lines) {
    const text = line.LineText.trim();
    if (text === "Mined Ore") sectionStart = line.MinTop;
    if (text === "Smelted Bars" && sectionStart !== null) {
      sectionEnd = line.MinTop;
      break;
    }
  }

  if (sectionStart === null) return null;

  // 收集區段內的數字行，依 Left 座標分左右欄（threshold ~100px）
  const LEFT_THRESHOLD = 100;
  const leftCol = [];  // Mined Ore
  const rightCol = []; // Ore to Mine

  for (const line of lines) {
    if (line.MinTop <= sectionStart) continue;
    if (sectionEnd !== null && line.MinTop >= sectionEnd) continue;

    const text = line.LineText.trim();
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || text.match(/[a-zA-Z]/)) continue;

    const leftPos = line.Words[0]?.Left ?? 0;
    if (leftPos < LEFT_THRESHOLD) {
      leftCol.push({ top: line.MinTop, value: num });
    } else {
      rightCol.push({ top: line.MinTop, value: num });
    }
  }

  // 右欄依 Top 排序即為 5 種礦的 ore_to_mine（緋紅、山銅、石化琥珀、鉍、維里西姆）
  rightCol.sort((a, b) => a.top - b.top);
  if (rightCol.length !== 5) return null;
  const oreToMine = rightCol.map((r) => r.value);

  // 左欄依 Top 排序，用 Top 座標對應到右欄的同一行（±10px），補 0 給缺失的礦
  leftCol.sort((a, b) => a.top - b.top);
  const minedOre = rightCol.map((right) => {
    const match = leftCol.find((l) => Math.abs(l.top - right.top) <= 10);
    return match ? match.value : 0;
  });

  return { minedOre, oreToMine };
}

function parseAndCalculate(text, lines) {
  // 偵測是否為新格式（含 Mined Ore 區段）
  const isNewFormat = text.includes("Mined Ore");

  if (isNewFormat) {
    const miningData = parseMinedOreSection(lines);
    if (!miningData) {
      displayError(t("parseErrorNew"));
      return;
    }

    // Smelted Bars 以下沿用舊邏輯：從 "Smelted Bars" 後取數字
    const afterSmelted = text.split("Smelted Bars")[1] || "";
    const smeltedAndBelow = afterSmelted.split(/\s+/);
    const numericValues = [];
    smeltedAndBelow.forEach((word) => {
      const number = word.replace(/[^0-9]/g, "");
      if (number) numericValues.push(parseInt(number, 10));
    });

    // 舊格式從 Smelted Bars 開始：緋紅(0)、山銅(1)、石化琥珀(2)、粉塵(3)、小麥(4)、玉米(5)、南瓜(6)、鉍(7)、維里西姆(8)、瓜果(9)、藍贊提蒙(10)
    // 但新圖只有 3 個 Smelted Bars（緋紅、山銅、石化琥珀），所以數量會不同
    // Crops 部分依舊格式對應
    if (numericValues.length < 11) {
      // 嘗試從完整 text 取 Crops 後的數值
    }

    // 從原始 text 取 Crops 區段數值
    const afterCrops = text.split("Crops")[1] || "";
    const cropWords = afterCrops.split(/\s+/);
    const cropNums = [];
    cropWords.forEach((word) => {
      const number = word.replace(/[^0-9]/g, "");
      if (number) cropNums.push(parseInt(number, 10));
    });

    // Crops 區段：左欄 684、608、785（小麥、玉米、南瓜），右欄 10597、75193（瓜果、藍贊提蒙）
    // 但也有 34233、50065 夾在 Smelted Bars 右欄——從 lines 取 Crops 區段後的左右欄
    const crops = parseCropsFromLines(lines);
    if (!crops) {
      displayError(t("parseCropFail"));
      return;
    }

    // Smelted Bars 數值（只取左欄前 3 個）
    const smeltedNums = parseSmeltedBarsFromLines(lines);
    const ores = smeltedNums.length === 5 ? smeltedNums : [
      smeltedNums[0] || 0,
      smeltedNums[1] || 0,
      smeltedNums[2] || 0,
      smeltedNums[3] || 0,
      smeltedNums[4] || 0,
    ];

    calculateAllValues(crops, ores, miningData);
  } else {
    // 舊格式
    const numericValues = [];
    const words = text.split(/\s+/);
    words.forEach((word) => {
      const number = word.replace(/[^0-9]/g, "");
      if (number) numericValues.push(parseInt(number, 10));
    });

    if (numericValues.length !== 11) {
      displayError(t("parseCountError", numericValues.length));
      return;
    }

    const ores = [
      numericValues[0],
      numericValues[1],
      numericValues[2],
      numericValues[7],
      numericValues[8],
    ];
    const crops = [
      numericValues[4],
      numericValues[5],
      numericValues[6],
      numericValues[9],
      numericValues[10],
    ];

    calculateAllValues(crops, ores);
  }
}

function parseCropsFromLines(lines) {
  let cropsStart = null;
  for (const line of lines) {
    if (line.LineText.trim() === "Crops") {
      cropsStart = line.MinTop;
      break;
    }
  }
  if (cropsStart === null) return null;

  const LEFT_THRESHOLD = 100;
  const leftCol = [];
  const rightCol = [];

  for (const line of lines) {
    if (line.MinTop <= cropsStart) continue;
    const text = line.LineText.trim();
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || text.match(/[a-zA-Z]/)) continue;

    const leftPos = line.Words[0]?.Left ?? 0;
    if (leftPos < LEFT_THRESHOLD) {
      leftCol.push({ top: line.MinTop, value: num });
    } else {
      rightCol.push({ top: line.MinTop, value: num });
    }
  }

  leftCol.sort((a, b) => a.top - b.top);
  rightCol.sort((a, b) => a.top - b.top);

  // 左欄：小麥、玉米、南瓜（3 個）；右欄：瓜果、藍贊提蒙（2 個）
  if (leftCol.length < 3 || rightCol.length < 2) return null;

  return [
    leftCol[0].value,  // 小麥
    leftCol[1].value,  // 玉米
    leftCol[2].value,  // 南瓜
    rightCol[0].value, // 瓜果
    rightCol[1].value, // 藍贊提蒙
  ];
}

function parseSmeltedBarsFromLines(lines) {
  let smeltedStart = null;
  let smeltedEnd = null;

  for (const line of lines) {
    const text = line.LineText.trim();
    if (text === "Smelted Bars") smeltedStart = line.MinTop;
    if (smeltedStart !== null && (text === "Thaumaturgic Dust" || text === "Crops")) {
      smeltedEnd = line.MinTop;
      break;
    }
  }

  if (smeltedStart === null) return [];

  const LEFT_THRESHOLD = 100;
  const leftCol = [];
  const rightCol = [];

  for (const line of lines) {
    if (line.MinTop <= smeltedStart) continue;
    if (smeltedEnd !== null && line.MinTop >= smeltedEnd) continue;

    const text = line.LineText.trim();
    const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (isNaN(num) || text.match(/[a-zA-Z]/)) continue;

    const leftPos = line.Words[0]?.Left ?? 0;
    if (leftPos < LEFT_THRESHOLD) {
      leftCol.push({ top: line.MinTop, value: num });
    } else {
      rightCol.push({ top: line.MinTop, value: num });
    }
  }

  leftCol.sort((a, b) => a.top - b.top);
  rightCol.sort((a, b) => a.top - b.top);

  // 左欄：緋紅、山銅、石化琥珀；右欄：鉍、維里西姆
  return [
    leftCol[0]?.value || 0,  // 緋紅
    leftCol[1]?.value || 0,  // 山銅
    leftCol[2]?.value || 0,  // 石化琥珀
    rightCol[0]?.value || 0, // 鉍
    rightCol[1]?.value || 0, // 維里西姆
  ];
}

function formatDuration(hours) {
  if (hours <= 0) return "0m";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function calculateAllValues(crops, ores, miningData = null) {
  let cropTotalValue = 0;
  let oreTotalValue = 0;

  // Build ore section HTML
  let oreHTML = `<div class="section-title">${t("oreSection")}</div>`;
  oreValueRatios.forEach((ore, index) => {
    const oreName = t("oreNames")[index];
    const oreQuantity = ores[index] || 10000;
    const oreValue = oreQuantity * ore.ratio;
    oreHTML += `
      <div class="crop-item">
        <span class="crop-name">${oreName}:</span>
        <input type="number" class="crop-quantity" value="${oreQuantity}" min="0" data-type="ore" data-index="${index}">
        <span class="crop-multiply">×</span>
        <input type="number" class="crop-ratio" value="${ore.ratio}" min="0" data-type="ore" data-index="${index}">
        <span class="crop-equal">=</span>
        <span class="crop-value">${oreValue.toLocaleString()}</span>
      </div>
    `;
    oreTotalValue += oreValue;
  });

  // Build crop section HTML
  let cropHTML = `<div class="section-title">${t("cropSection")}</div>`;
  cropValueRatios.forEach((crop, index) => {
    const cropName = t("cropNames")[index];
    const cropQuantity = crops[index] || 10000;
    const cropValue = cropQuantity * crop.ratio;
    cropHTML += `
      <div class="crop-item">
        <span class="crop-name">${cropName}:</span>
        <input type="number" class="crop-quantity" value="${cropQuantity}" min="0" data-type="crop" data-index="${index}">
        <span class="crop-multiply">×</span>
        <input type="number" class="crop-ratio" value="${crop.ratio}" min="0" data-type="crop" data-index="${index}">
        <span class="crop-equal">=</span>
        <span class="crop-value">${cropValue.toLocaleString()}</span>
      </div>
    `;
    cropTotalValue += cropValue;
  });

  // Build mining time section HTML if miningData available
  let miningHTML = "";
  let totalMiningHours = 0;
  if (miningData) {
    miningHTML = `<div class="section-title mining-title">${t("miningSection")}</div>`;
    oreValueRatios.forEach((ore, index) => {
      const oreName = t("oreNames")[index];
      const mined = miningData.minedOre[index] || 0;
      const toMine = miningData.oreToMine[index] || 0;
      const total = mined + toMine;
      const smeltRate = oreMiningRates[index] / 2;
      const smeltHours = total / smeltRate;
      totalMiningHours += smeltHours;

      miningHTML += `
        <div class="crop-item mining-item">
          <span class="crop-name">${oreName}:</span>
          <input type="number" class="mining-mined" value="${mined}" min="0" data-index="${index}">
          <span class="crop-multiply">+</span>
          <input type="number" class="mining-to-mine" value="${toMine}" min="0" data-index="${index}">
          <span class="crop-equal">=</span>
          <span class="mining-total">${total.toLocaleString()}</span>
          <span class="mining-time">${formatDuration(smeltHours)}</span>
        </div>
      `;
    });
  }

  const output = document.getElementById("output");
  output.innerHTML = `
    <div class="sections-container">
      <div class="section-column">${oreHTML}</div>
      <div class="section-column">${cropHTML}</div>
    </div>
  `;

  const miningContainer = document.getElementById("miningContainer");
  if (miningHTML) {
    miningContainer.innerHTML = `<div class="mining-section">${miningHTML}</div>`;
    document.querySelectorAll(".mining-mined, .mining-to-mine").forEach((input) => {
      input.addEventListener("input", recalculateMining);
    });
  } else {
    miningContainer.innerHTML = "";
  }

  const result = document.getElementById("result");

  document.querySelectorAll(".crop-value").forEach((el) => {
    el.style.transition = "opacity 0.5s ease-in-out";
    el.style.opacity = "0";
  });
  result.style.transition = "opacity 0.5s ease-in-out";
  result.style.opacity = "0";

  setTimeout(() => {
    document.querySelectorAll(".crop-value").forEach((el, index) => {
      if (index < 5) {
        const oreValue = ores[index] * oreValueRatios[index].ratio;
        el.textContent = `${oreValue.toLocaleString()}`;
      } else {
        const cropIndex = index - 5;
        const cropValue = crops[cropIndex] * cropValueRatios[cropIndex].ratio;
        el.textContent = `${cropValue.toLocaleString()}`;
      }
      el.style.opacity = "1";
    });

    let projectedOreTotalValue = oreTotalValue;
    if (miningData) {
      oreValueRatios.forEach((ore, index) => {
        const total = (miningData.minedOre[index] || 0) + (miningData.oreToMine[index] || 0);
        projectedOreTotalValue += total * ore.ratio;
      });
    }

    const cropGain = Math.round(CROP_VALUE_PER_HOUR * totalMiningHours);
    const currentTotal = cropTotalValue + oreTotalValue;
    const projectedCropTotal = cropTotalValue + cropGain;
    const projectedTotal = projectedCropTotal + projectedOreTotalValue;
    const oreGain = projectedOreTotalValue - oreTotalValue;

    let resultHTML;
    if (miningData) {
      resultHTML = `
        <div class="result-cards">
          <div class="result-card">
            <div class="result-card-title">${t("currentCard")}</div>
            <div class="result-card-row"><span>${t("cropTotal")}</span><span class="card-current-crop">${cropTotalValue.toLocaleString()}</span></div>
            <div class="result-card-row"><span>${t("oreTotal")}</span><span class="card-current-ore">${oreTotalValue.toLocaleString()}</span></div>
            <div class="result-card-total card-current-total">${currentTotal.toLocaleString()}</div>
          </div>
          <div class="result-card-arrow">→</div>
          <div class="result-card result-card-projected">
            <div class="result-card-title">${t("projectedCard")}</div>
            <div class="result-card-row"><span>${t("cropTotal")}</span><span class="card-projected-crop">${projectedCropTotal.toLocaleString()} <span class="ore-gain card-crop-gain">+${cropGain.toLocaleString()}</span></span></div>
            <div class="result-card-row"><span>${t("oreTotal")}</span><span class="card-projected-ore">${projectedOreTotalValue.toLocaleString()} <span class="ore-gain card-ore-gain">+${oreGain.toLocaleString()}</span></span></div>
            <div class="result-card-total card-projected-total">${projectedTotal.toLocaleString()}</div>
            <div class="result-card-eta card-eta">${t("eta")}: ${formatDuration(totalMiningHours)}</div>
          </div>
        </div>
      `;
    } else {
      resultHTML = `
        <div>${t("cropTotal")}: ${cropTotalValue.toLocaleString()}</div>
        <div>${t("oreTotal")}: ${oreTotalValue.toLocaleString()}</div>
        <div class="total-value">${t("grandTotal")}: ${currentTotal.toLocaleString()}</div>
      `;
    }
    result.innerHTML = resultHTML;
    result.style.opacity = "1";
  }, 500);

  document.querySelectorAll(".crop-quantity, .crop-ratio").forEach((input) => {
    input.addEventListener("input", recalculate);
  });
}

function recalculate() {
  const cropItems = document.querySelectorAll(".crop-item:not(.mining-item)");
  let cropTotalValue = 0;
  let oreTotalValue = 0;

  cropItems.forEach((item) => {
    const quantityEl = item.querySelector(".crop-quantity");
    const ratioEl = item.querySelector(".crop-ratio");
    if (!quantityEl || !ratioEl) return;

    const quantity = parseInt(quantityEl.value, 10) || 0;
    const ratio = parseInt(ratioEl.value, 10) || 0;
    const value = quantity * ratio;

    item.querySelector(".crop-value").textContent = `${value.toLocaleString()}`;

    const type = quantityEl.getAttribute("data-type");
    if (type === "crop") {
      cropTotalValue += value;
    } else if (type === "ore") {
      oreTotalValue += value;
    }
  });

  const result = document.getElementById("result");

  if (result.querySelector(".result-cards")) {
    updateResultCards(cropTotalValue, oreTotalValue);
  } else {
    result.innerHTML = `
      <div>${t("cropTotal")}: ${cropTotalValue.toLocaleString()}</div>
      <div>${t("oreTotal")}: ${oreTotalValue.toLocaleString()}</div>
      <div class="total-value">${t("grandTotal")}: ${(cropTotalValue + oreTotalValue).toLocaleString()}</div>
    `;
  }
}

function getResultTotals() {
  let cropTotalValue = 0;
  let oreTotalValue = 0;
  document.querySelectorAll(".crop-item:not(.mining-item)").forEach((item) => {
    const quantityEl = item.querySelector(".crop-quantity");
    const ratioEl = item.querySelector(".crop-ratio");
    if (!quantityEl || !ratioEl) return;
    const value = (parseInt(quantityEl.value, 10) || 0) * (parseInt(ratioEl.value, 10) || 0);
    if (quantityEl.getAttribute("data-type") === "crop") cropTotalValue += value;
    else if (quantityEl.getAttribute("data-type") === "ore") oreTotalValue += value;
  });
  return { cropTotalValue, oreTotalValue };
}

function updateResultCards(cropTotalValue, oreTotalValue) {
  const result = document.getElementById("result");

  let projectedOreTotalValue = oreTotalValue;
  let totalMiningHours = 0;
  document.querySelectorAll(".mining-item").forEach((item) => {
    const index = parseInt(item.querySelector(".mining-mined").getAttribute("data-index"), 10);
    const mined = parseInt(item.querySelector(".mining-mined").value, 10) || 0;
    const toMine = parseInt(item.querySelector(".mining-to-mine").value, 10) || 0;
    projectedOreTotalValue += (mined + toMine) * oreValueRatios[index].ratio;
    totalMiningHours += (mined + toMine) / (oreMiningRates[index] / 2);
  });

  const cropGain = Math.round(CROP_VALUE_PER_HOUR * totalMiningHours);
  const oreGain = projectedOreTotalValue - oreTotalValue;
  const currentTotal = cropTotalValue + oreTotalValue;
  const projectedCropTotal = cropTotalValue + cropGain;
  const projectedTotal = projectedCropTotal + projectedOreTotalValue;

  result.querySelector(".card-current-crop").textContent = cropTotalValue.toLocaleString();
  result.querySelector(".card-current-ore").textContent = oreTotalValue.toLocaleString();
  result.querySelector(".card-current-total").textContent = currentTotal.toLocaleString();
  result.querySelector(".card-projected-crop").textContent = projectedCropTotal.toLocaleString();
  result.querySelector(".card-crop-gain").textContent = `+${cropGain.toLocaleString()}`;
  result.querySelector(".card-projected-ore").textContent = projectedOreTotalValue.toLocaleString();
  result.querySelector(".card-ore-gain").textContent = `+${oreGain.toLocaleString()}`;
  result.querySelector(".card-projected-total").textContent = projectedTotal.toLocaleString();
  result.querySelector(".card-eta").textContent = `${t("eta")}: ${formatDuration(totalMiningHours)}`;
}

function recalculateMining() {
  let totalMiningHours = 0;

  document.querySelectorAll(".mining-item").forEach((item) => {
    const index = parseInt(item.querySelector(".mining-mined").getAttribute("data-index"), 10);
    const mined = parseInt(item.querySelector(".mining-mined").value, 10) || 0;
    const toMine = parseInt(item.querySelector(".mining-to-mine").value, 10) || 0;
    const total = mined + toMine;
    const smeltHours = total / (oreMiningRates[index] / 2);
    totalMiningHours += smeltHours;

    item.querySelector(".mining-total").textContent = total.toLocaleString();
    item.querySelector(".mining-time").textContent = formatDuration(smeltHours);
  });

  const result = document.getElementById("result");
  if (result.querySelector(".result-cards")) {
    const { cropTotalValue, oreTotalValue } = getResultTotals();
    updateResultCards(cropTotalValue, oreTotalValue);
  }
}

function displayError(message) {
  const result = document.getElementById("result");
  const div = document.createElement("div");
  div.className = "error-message";
  div.textContent = message;
  result.innerHTML = "";
  result.appendChild(div);
}

pasteButton.addEventListener("click", pasteImage);
