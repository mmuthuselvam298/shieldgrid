const API_BASE = "http://127.0.0.1:8000";

const fileInput = document.getElementById("fileInput");
const fileBtn = document.getElementById("analyzeFileBtn");
const dropzone = document.getElementById("dropzone");

let activeAnonymizedText = "";
let currentEntitiesCount = 0;
let activeEntitySummary = {};
let activeDetectedEntities = [];
let activeOriginalText = "";

const colorPalette = ["#2563eb", "#db2777", "#16a34a", "#ca8a04", "#7c3aed", "#ea580c", "#2563eb"];
const metaMatrix = {
  finance: {
    title: "Financial Protection Domain (BFSI)",
    items: ["Banking Infrastructure (PAN, Aadhaar, GST)", "Transaction / UTR Logs (IMPS/NEFT/RTGS)", "Payment Instruments (Cards, CVV, Expiry)", "Financial Accounts (Bank Accounts, Loans, Demat)", "International Passports"],
    accent: "#2563eb", // Professional Blue
    panelBg: "rgba(37, 99, 235, 0.05)",
    label: "Finance Mode",
  },
  healthcare: {
    title: "Healthcare Compliance Domain",
    items: ["Patient Alpha Profiles", "Medical Record Strings (MRN)", "Global Health Insurance Keys", "Clinical Classification Coding (ICD-10)", "Chronological Target Coordinates (DOB)"],
    accent: "#db2777", // Clinical Pink / Magenta
    panelBg: "rgba(219, 39, 119, 0.05)",
    label: "Healthcare Mode",
  },
  general: {
    title: "General Security Domain",
    items: ["Personal Identifiable Names", "Telephone Contact Records", "Electronic Mail Coordinates", "Physical Location Metrics", "International Passports"],
    accent: "#16a34a", // Soft Green
    panelBg: "rgba(22, 163, 74, 0.05)",
    label: "General Mode",
  },
};

window.addEventListener("DOMContentLoaded", () => {
  const persistedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", persistedTheme);
  document.getElementById("themeToggle").textContent = persistedTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  updateProfileMetrics();
  pingApi();
});

function selectedCompliance() {
  return document.querySelector('input[name="complianceProfile"]:checked').value;
}

async function pingApi() {
  const status = document.getElementById("apiStatus");
  try {
    const response = await fetch(`${API_BASE}/`);
    if (!response.ok) throw new Error();
    status.textContent = "SECURE LINK ONLINE";
    status.className = "status-pill online";
  } catch {
    status.textContent = "OFFLINE LINK CLOSED";
    status.className = "status-pill";
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const targetTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", targetTheme);
  localStorage.setItem("theme", targetTheme);
  document.getElementById("themeToggle").textContent = targetTheme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  pulseElement(document.querySelector(".hero"));
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

function clearAll() {
  if (activeAnonymizedText || document.getElementById("inputText").value.trim()) {
    if (!confirm("Are you sure you want to clear your data input and workspace records?")) return;
  }

  document.getElementById("inputText").value = "";
  fileInput.value = "";
  document.getElementById("selectedFile").textContent = "";
  const out = document.getElementById("output");
  out.textContent = "🟢 No active sanitization session established. Gateway is clean.";
  out.className = "empty-state-output";
  
  document.getElementById("downloadSection").style.display = "none";
  document.getElementById("downloadStatus").textContent = "";
  document.getElementById("summaryCard").style.display = "none";
  document.getElementById("chartPanel").style.display = "none";
  document.getElementById("metricsLedger").style.display = "none";
  document.getElementById("diffContainer").style.display = "none";
  document.getElementById("entityTable").style.display = "none";
  document.getElementById("searchWrapper").style.display = "none";
  document.getElementById("outputActions").style.display = "none";
  document.getElementById("searchOutputInput").value = "";
  document.getElementById("searchMatchCount").textContent = "";
  
  document.querySelectorAll(".timeline-step").forEach(s => s.className = "timeline-step");
  
  activeAnonymizedText = "";
  activeOriginalText = "";
  activeDetectedEntities = [];
  currentEntitiesCount = 0;
  activeEntitySummary = {};
  fileBtn.disabled = true;
  
  updateRiskGauge(0, 0);
  showToast("Workspace records successfully cleared.", "neutral");
}

function copyOutput() {
  if (!activeAnonymizedText) return;
  navigator.clipboard.writeText(activeAnonymizedText);
  showToast("Anonymized data stream copied to system buffer.");
}

function triggerFileBrowse() {
  fileInput.click();
}

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragover");
    }, false);
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragover");
    }, false);
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    handleFileValidation(files[0]);
  }
});

fileInput.addEventListener("change", function () {
  if (this.files.length > 0) {
    handleFileValidation(this.files[0]);
  }
});

function handleFileValidation(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const allowed = ["txt", "pdf", "docx", "jpg", "jpeg", "png"];

  if (!allowed.includes(extension)) {
    showToast("Unsupported file signature format.", "danger");
    fileInput.value = "";
    document.getElementById("selectedFile").textContent = "";
    fileBtn.disabled = true;
    return;
  }

  document.getElementById("selectedFile").textContent = `${file.name} (${extension.toUpperCase()})`;
  document.getElementById("output").textContent = "🟢 Asset staged. Ready for server-side processing.";
  document.getElementById("downloadSection").style.display = "none";
  document.getElementById("summaryCard").style.display = "none";
  document.getElementById("chartPanel").style.display = "none";
  document.getElementById("metricsLedger").style.display = "none";
  document.getElementById("outputActions").style.display = "none";
  document.getElementById("diffContainer").style.display = "none";
  document.getElementById("entityTable").style.display = "none";
  document.getElementById("searchWrapper").style.display = "none";
  fileBtn.disabled = false;
}

function animateProgressStep(percentage, textStatus, activeStepId) {
  revealElement("loadingProgress", "block");
  document.getElementById("progressBarFill").style.width = `${percentage}%`;
  document.getElementById("progressStatus").textContent = textStatus;
  
  if (activeStepId) {
    const target = document.getElementById(activeStepId);
    if (target) {
      target.className = "timeline-step active";
      pulseElement(target);
    }
  }
}

function terminateProgressBars() {
  document.getElementById("progressBarFill").style.width = "100%";
  document.getElementById("progressStatus").textContent = "All transformation pipeline cycles executed.";
  document.querySelectorAll(".timeline-step").forEach(s => s.className = "timeline-step complete");
  setTimeout(() => {
    document.getElementById("loadingProgress").style.display = "none";
  }, 450);
}

function updateProfileMetrics() {
  const chosen = selectedCompliance();
  const data = metaMatrix[chosen];
  document.documentElement.style.setProperty("--accent", data.accent);
  document.documentElement.style.setProperty("--panel-accent-bg", data.panelBg);
  
  document.getElementById("panelTitle").textContent = data.title;
  document.getElementById("matrixMode").textContent = data.label;

  const listContainer = document.getElementById("panelList");
  listContainer.innerHTML = "";
  data.items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.style.animationDelay = `${listContainer.children.length * 45}ms`;
    listContainer.appendChild(li);
  });

  document.querySelectorAll(".profile-card").forEach((card) => {
    card.classList.toggle("active", card.querySelector("input").checked);
  });
  
  if (activeAnonymizedText) {
    buildPureCSSChart();
  }

  pulseElement(document.querySelector(".info-panel"));
  pulseElement(document.querySelector(".signal-panel"));
}

function animateCount(id, targetValue) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const duration = 400;
  if(targetValue === 0) { el.textContent = 0; return; }
  const stepTime = Math.max(10, Math.floor(duration / (targetValue || 1)));
  const timer = setInterval(() => {
    current += Math.ceil(targetValue / 20);
    if (current >= targetValue) {
      el.textContent = targetValue;
      clearInterval(timer);
    } else {
      el.textContent = current;
    }
  }, stepTime);
}

function updateRiskGauge(entitiesCount, length) {
  const fill = document.getElementById("gaugeFill");
  const val = document.getElementById("gaugeValue");
  const riskText = document.getElementById("gaugeRiskText");
  const sRisk = document.getElementById("statRisk");
  const sConfidence = document.getElementById("statConfidence");

  let factor = length > 0 ? (entitiesCount / (length * 0.04)) * 100 : 0;
  let score = Math.max(0, Math.min(100, Math.round(factor)));
  
  if (entitiesCount > 0 && score === 0) score = 12;

  const offset = 264 - (264 * score) / 100;
  fill.style.strokeDashoffset = offset;
  val.textContent = `${score}%`;

  animateCount("statEntities", entitiesCount);

  if (score === 0) {
    riskText.textContent = "CLEAN";
    riskText.style.color = "var(--success)";
    sRisk.textContent = "Minimal";
    sRisk.style.color = "var(--success)";
    sConfidence.textContent = "100%";
  } else if (score < 35) {
    riskText.textContent = "LOW RISK";
    riskText.style.color = "var(--accent-2)";
    sRisk.textContent = "Low";
    sRisk.style.color = "var(--accent-2)";
    sConfidence.textContent = "94%";
  } else if (score < 70) {
    riskText.textContent = "MODERATE";
    riskText.style.color = "var(--accent)";
    sRisk.textContent = "Medium";
    sRisk.style.color = "var(--accent)";
    sConfidence.textContent = "88%";
  } else {
    riskText.textContent = "CRITICAL";
    riskText.style.color = "var(--danger)";
    sRisk.textContent = "HIGH RISK";
    sRisk.style.color = "var(--danger)";
    sConfidence.textContent = "76%";
  }
}

async function analyzeText(event) {
  event.preventDefault();
  const text = document.getElementById("inputText").value.trim();
  if (!text) {
    showToast("Please enter target text buffers.", "danger");
    return;
  }

  setButtonBusy("analyzeTextBtn", true, "Analyzing...");
  document.querySelectorAll(".timeline-step").forEach(s => s.className = "timeline-step");
  
  animateProgressStep(15, "Parsing content stream variables...", "step-ocr");

  try {
    await new Promise(r => setTimeout(r, 200));
    animateProgressStep(45, "Running context classification trees...", "step-recognize");
    
    const response = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, compliance: selectedCompliance() }),
    });
    if (!response.ok) throw new Error();
    
    animateProgressStep(75, "Compiling profile masking ledger...", "step-filter");
    const data = await response.json();
    
    await new Promise(r => setTimeout(r, 200));
    animateProgressStep(92, "Applying cryptographic token blocks...", "step-redact");
    
    renderAnalysis(data);
    terminateProgressBars();
    showToast("Content processing successfully executed.");
    pingApi();
  } catch {
    showToast("Network link analysis exception caught.", "danger");
    document.getElementById("loadingProgress").style.display = "none";
  } finally {
    setButtonBusy("analyzeTextBtn", false, "Analyze Stream");
  }
}

async function analyzeFile(event) {
  event.preventDefault();
  if (!fileInput.files.length) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("compliance", selectedCompliance());

  setButtonBusy("analyzeFileBtn", true, "Processing...");
  document.querySelectorAll(".timeline-step").forEach(s => s.className = "timeline-step");
  
  animateProgressStep(20, "Executing deep binary OCR extraction...", "step-ocr");

  try {
    await new Promise(r => setTimeout(r, 400));
    animateProgressStep(50, "Evaluating structural document content...", "step-recognize");
    
    const response = await fetch(`${API_BASE}/analyze-file`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error();
    
    animateProgressStep(75, "Filtering entities by targeted domain...", "step-filter");
    const data = await response.json();
    
    await new Promise(r => setTimeout(r, 300));
    animateProgressStep(90, "Assembling sanitized file parameters...", "step-redact");
    
    renderAnalysis(data);
    terminateProgressBars();
    showToast("Document sanitation successfully executed.");
    pingApi();
  } catch {
    showToast("File stream link conversion failure.", "danger");
    document.getElementById("loadingProgress").style.display = "none";
  } finally {
    setButtonBusy("analyzeFileBtn", false, "Extract & Scan");
  }
}

function setButtonBusy(id, busy, text) {
  const button = document.getElementById(id);
  button.disabled = busy;
  button.textContent = text;
}

function renderAnalysis(data) {
  activeAnonymizedText = data.anonymized_text || "";
  activeOriginalText = data.original_text || "";
  activeDetectedEntities = data.detected_entities || [];
  activeEntitySummary = data.entity_summary || {};
  currentEntitiesCount = Object.values(activeEntitySummary).reduce((sum, count) => sum + count, 0);

  const out = document.getElementById("output");
  out.textContent = activeAnonymizedText;
  out.className = "";
  
  revealElement("downloadSection", "flex");
  revealElement("outputActions", "flex");
  revealElement("searchWrapper", "flex");
  pulseElement(document.querySelector(".results-panel"));

  updateRiskGauge(currentEntitiesCount, activeOriginalText.length);
  renderSummary();
  renderLedger();
  renderDiffCards();
  renderEntityTable();
  buildPureCSSChart();
}

function renderSummary() {
  const summary = document.getElementById("summaryCard");
  const uniqueEntities = Object.keys(activeEntitySummary).length;
  const profile = metaMatrix[selectedCompliance()].label;

  summary.innerHTML = `
    <div><strong id="cnt-1">0</strong><span>Isolations</span></div>
    <div><strong id="cnt-2">0</strong><span>Entity Classes</span></div>
    <div><strong>${profile.split(" ")[0]}</strong><span>Policy Profile</span></div>
  `;
  revealElement("summaryCard", "grid");
  
  animateCount("cnt-1", currentEntitiesCount);
  animateCount("cnt-2", uniqueEntities);
}

function renderLedger() {
  const ledger = document.getElementById("metricsLedger");
  const entries = Object.entries(activeEntitySummary).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    ledger.innerHTML = `<div class="empty-copy">🟢 Risk profile minimal. No signatures verified.</div>`;
  } else {
    ledger.innerHTML = entries
      .map(([entity, count]) => {
        const width = Math.max(8, Math.min(100, (count / currentEntitiesCount) * 100));
        return `
          <div class="ledger-row animate-slide-up">
            <span>${formatEntity(entity)}</span>
            <strong>${count}</strong>
            <i style="width:${width}%"></i>
          </div>
        `;
      })
      .join("");
  }
  revealElement("metricsLedger", "block");
}

function buildPureCSSChart() {
  const chartPanel = document.getElementById("chartPanel");
  const donut = document.getElementById("donutChartContainer");
  const legend = document.getElementById("chartLegendContainer");

  const entries = Object.entries(activeEntitySummary).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    chartPanel.style.display = "none";
    return;
  }
  
  revealElement("chartPanel", "block");
  document.getElementById("chartTotalValue").textContent = currentEntitiesCount;
  
  let currentPercentageAccumulator = 0;
  let gradientStrings = [];
  legend.innerHTML = "";

  entries.forEach(([entity, count], idx) => {
    const color = colorPalette[idx % colorPalette.length];
    const percentage = (count / currentEntitiesCount) * 100;
    const nextAccumulator = currentPercentageAccumulator + percentage;
    
    gradientStrings.push(`${color} ${currentPercentageAccumulator}% ${nextAccumulator}%`);
    currentPercentageAccumulator = nextAccumulator;

    const item = document.createElement("div");
    item.className = "legend-item animate-slide-up";
    item.style.animationDelay = `${idx * 30}ms`;
    item.innerHTML = `
      <span><i class="legend-dot" style="background:${color}"></i>${formatEntity(entity)}</span>
      <strong>${percentage.toFixed(0)}%</strong>
    `;
    legend.appendChild(item);
  });

  donut.style.background = `conic-gradient(${gradientStrings.join(", ")})`;
}

function renderDiffCards() {
  const container = document.getElementById("diffContainer");
  const items = activeDetectedEntities.slice(0, 12);

  if (!items.length) {
    container.innerHTML = `<div class="empty-copy">Transformation stream logs empty.</div>`;
  } else {
    container.innerHTML = items
      .map((item, idx) => `
        <article class="diff-card animate-slide-up" style="animation-delay: ${idx * 25}ms">
          <span class="diff-orig">${escapeHtml(item.fragment)}</span>
          <span class="diff-arrow">redacted to</span>
          <span class="diff-repl">&lt;${escapeHtml(item.entity)}&gt;</span>
        </article>
      `).join("");

    if (activeDetectedEntities.length > items.length) {
      container.innerHTML += `<div class="diff-overflow-badge">+${activeDetectedEntities.length - items.length} additional transformations filtered</div>`;
    }
  }
  revealElement("diffContainer", "grid");
}

function renderEntityTable() {
  const table = document.getElementById("entityTable");
  const body = document.getElementById("entityTableBody");
  const grouped = {};

  activeDetectedEntities.forEach((entity) => {
    if (!grouped[entity.entity]) {
      grouped[entity.entity] = { count: 0, score: 0 };
    }
    grouped[entity.entity].count += 1;
    grouped[entity.entity].score = Math.max(grouped[entity.entity].score, entity.score);
  });

  const rows = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="3">No sensitive tracking tokens isolated.</td></tr>`;
  } else {
    body.innerHTML = rows
      .map(([entity, data]) => `
        <tr class="animate-slide-up">
          <td><strong>${formatEntity(entity)}</strong></td>
          <td>${data.count}</td>
          <td><span class="badge-percentage">${Math.round(data.score * 100)}%</span> reliability</td>
        </tr>
      `).join("");
  }
  revealElement("entityTable", "table");
}

function executeOutputSearch() {
  const term = document.getElementById("searchOutputInput").value.trim();
  const output = document.getElementById("output");
  const count = document.getElementById("searchMatchCount");

  if (!term) {
    output.textContent = activeAnonymizedText;
    count.textContent = "";
    return;
  }

  const escaped = escapeRegExp(term);
  const regex = new RegExp(escaped, "gi");
  const matches = activeAnonymizedText.match(regex) || [];
  output.innerHTML = escapeHtml(activeAnonymizedText).replace(regex, (match) => `<mark>${escapeHtml(match)}</mark>`);
  count.textContent = `${matches.length} matches`;
}

async function downloadRedactedOutput(event) {
  event.preventDefault();
  if (!activeAnonymizedText) return;

  const format = document.querySelector('input[name="exportFormat"]:checked').value;
  const status = document.getElementById("downloadStatus");
  status.innerHTML = `<span class="pulse-text">Securing ${format.toUpperCase()} payload...</span>`;

  try {
    const response = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: activeAnonymizedText,
        format,
        compliance: selectedCompliance(),
        entities_count: currentEntitiesCount,
        entity_summary: activeEntitySummary,
      }),
    });

    if (!response.ok) throw new Error();
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const fileNameMatch = disposition.match(/filename="(.+)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `shieldgrid_report.${format}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    
    status.innerHTML = `<span style="color:var(--success)">✓ File Generated Successfully</span>`;
    showToast("Report package exported successfully.");
  } catch (error) {
    status.innerHTML = "<span style='color:var(--danger)'>Export failure</span>";
    showToast("Document generation failure.", "danger");
  }
}

function formatEntity(entity) {
  return entity.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function revealElement(id, displayValue) {
  const element = document.getElementById(id);
  if (!element) return;
  element.style.display = displayValue;
  element.classList.remove("animate-pop-in");
  void element.offsetWidth;
  element.classList.add("animate-pop-in");
}

function pulseElement(element) {
  if (!element) return;
  element.classList.remove("result-flash");
  void element.offsetWidth;
  element.classList.add("result-flash");
}
