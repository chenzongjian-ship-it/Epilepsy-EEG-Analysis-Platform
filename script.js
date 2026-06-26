const steps = Array.from(document.querySelectorAll('.step'));
const navItems = Array.from(document.querySelectorAll('.nav-item'));
const fileInput = document.querySelector('#edfFile');
const analyzeBtn = document.querySelector('#analyzeBtn');
const exportBtn = document.querySelector('#exportBtn');
const fileHint = document.querySelector('#fileHint');
const runStatus = document.querySelector('#runStatus');
const resultChain = document.querySelector('#resultChain');
const featureRows = document.querySelector('#featureRows');
const probability = document.querySelector('#probability');
const fileList = document.querySelector('#fileList');
const batchSummary = document.querySelector('#batchSummary');
const spectrogramCanvas = document.querySelector('#spectrogramCanvas');
const spectrogramReadout = document.querySelector('#spectrogramReadout');
const fileResultRows = document.querySelector('#fileResultRows');
let lastSpectrogram = null;
let lastAnalysisResults = [];

const chainLabels = [
  '数据读取：解析 EDF header、通道参数、采样率和数字信号记录',
  '预处理：完成均值去除、标准化和轻量平滑滤波',
  '特征提取：生成 RMS、线长、θ/α/β 能量、谱熵和 Hjorth 指标',
  '模型训练：基于特征评分进行前端轻量概率估计',
  '结果评估：输出每个 EDF 文件的概率、标签和批量汇总指标',
  '报告导出：生成包含文件级特征和预测结果的分析摘要 JSON'
];

function setActiveStep(index) {
  steps.forEach((step, i) => {
    step.classList.toggle('active', i === index);
    step.classList.toggle('done', i < index);
  });
}

function drawWaveform(active = false, signal = null) {
  const canvas = document.querySelector('#waveCanvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 28; y < height; y += 38) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  if (signal && signal.length > 8) {
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(signal.length / width));
    const visible = [];
    for (let i = 0; i < signal.length; i += step) visible.push(signal[i]);
    const maxAbs = Math.max(...visible.map((value) => Math.abs(value))) || 1;
    visible.forEach((value, index) => {
      const x = (index / Math.max(1, visible.length - 1)) * width;
      const y = height / 2 - (value / maxAbs) * (height * 0.36);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    visible.forEach((value, index) => {
      const smooth = (visible[Math.max(0, index - 2)] + value * 2 + visible[Math.min(visible.length - 1, index + 2)]) / 4;
      const x = (index / Math.max(1, visible.length - 1)) * width;
      const y = height / 2 - (smooth / maxAbs) * (height * 0.28);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    return;
  }

  const drawLine = (color, offset, amp, noise) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = 0; x < width; x += 4) {
      const spike = active && x > width * 0.56 && x < width * 0.68 ? Math.sin(x * 0.32) * 22 : 0;
      const y = height / 2 + Math.sin(x * 0.035 + offset) * amp + Math.sin(x * 0.13) * noise + spike;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  drawLine('#2563eb', 0, 34, 9);
  drawLine('#22c55e', 1.1, 24, 5);
}

function renderInitialChain() {
  resultChain.innerHTML = '<li>等待上传 EDF 文件</li>';
}

async function runAnalysis() {
  const files = Array.from(fileInput.files);
  analyzeBtn.disabled = true;
  exportBtn.disabled = true;
  resultChain.innerHTML = '';
  runStatus.textContent = `批量分析中：${files.length} 个 EDF`;
  lastAnalysisResults = [];

  try {
    appendChainItem(0, '数据读取：开始解析 EDF header、通道参数和数字信号记录');
    const parsedFiles = [];
    for (const file of files) {
      parsedFiles.push(await parseEdfFile(file));
    }
    completeChainStep(0, `数据读取：成功解析 ${parsedFiles.length} 个 EDF 文件`);

    appendChainItem(1, '预处理：执行均值去除、标准化和轻量平滑滤波');
    await wait(160);
    const preprocessed = parsedFiles.map((edf) => ({ ...edf, signal: preprocessSignal(edf.signal) }));
    completeChainStep(1, '预处理：完成通道信号标准化');

    appendChainItem(2, '特征提取：计算 RMS、θ/α/β 能量、谱熵和 Hjorth 指标');
    await wait(160);
    const featureSets = preprocessed.map((edf) => ({ ...edf, features: extractFeatures(edf.signal, edf.sampleRate) }));
    completeChainStep(2, '特征提取：完成批量特征矩阵生成');

    appendChainItem(3, '模型训练：基于特征评分进行癫痫发作概率估计');
    await wait(160);
    const predictions = featureSets.map((edf) => ({ ...edf, prediction: predictSeizure(edf.features) }));
    completeChainStep(3, '模型训练：完成文件级预测');

    appendChainItem(4, '结果评估：汇总文件级概率、批量指标和异常频带');
    await wait(160);
    lastAnalysisResults = predictions;
    renderAnalysisResults(predictions);
    completeChainStep(4, '结果评估：完成批量结果汇总');

    appendChainItem(5, '报告导出：生成包含 EDF header、特征、STFT 和预测结果的摘要');
    setActiveStep(5);
    completeChainStep(5, '报告导出：报告数据已就绪');
    runStatus.textContent = `分析完成：${files.length} 个文件`;
    exportBtn.disabled = false;
  } catch (error) {
    runStatus.textContent = '分析失败';
    resultChain.innerHTML += `<li class="error">${escapeHtml(error.message)}</li>`;
  } finally {
    analyzeBtn.disabled = false;
  }
}

function exportReport() {
  const payload = {
    project: 'EEG Workbench - Seizure Analysis',
    files: lastAnalysisResults.map((item) => ({
      name: item.name,
      channels: item.channels,
      sampleRate: item.sampleRate,
      durationSeconds: item.durationSeconds,
      prediction: item.prediction
    })),
    pipeline: chainLabels,
    batchSummary: summarizeBatch(lastAnalysisResults),
    spectrogram: { frequencyRangeHz: '0-40', unit: 'Normalized Power(dB)', method: 'browser-side STFT' },
    platformEntry: 'GitHub Pages: https://用户名.github.io/仓库名/'
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'eeg-analysis-report.json';
  a.click();
  URL.revokeObjectURL(url);
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((nav) => nav.classList.remove('active'));
    item.classList.add('active');
    const target = document.querySelector(`#${item.dataset.target}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

fileInput.addEventListener('change', () => {
  const files = Array.from(fileInput.files);
  analyzeBtn.disabled = files.length === 0;
  fileHint.textContent = files.length ? `${files.length} 个 EDF 文件已就绪，可以开始批量分析` : '支持批量选择 .edf 脑电文件';
  runStatus.textContent = files.length ? `EDF 队列已加载：${files.length} 个文件` : '等待 EDF 文件';
  renderFileList(files);
});

analyzeBtn.addEventListener('click', runAnalysis);
exportBtn.addEventListener('click', exportReport);
drawWaveform(false);
drawSpectrogram(false, 1);
renderInitialChain();

function renderFileList(files) {
  if (!files.length) {
    fileList.className = 'file-list empty';
    fileList.textContent = '尚未选择 EDF 文件';
    batchSummary.textContent = '等待文件';
    return;
  }
  fileList.className = 'file-list';
  batchSummary.textContent = `${files.length} 个 EDF 文件`;
  fileList.innerHTML = files.map((file, index) => `
    <div class="file-chip">
      <strong>${String(index + 1).padStart(2, '0')} · ${file.name}</strong>
      <span>${formatFileSize(file.size)} · 待分析</span>
    </div>
  `).join('');
}

function formatFileSize(size) {
  if (!size) return '未知大小';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function drawSpectrogram(matrix = null) {
  const canvas = spectrogramCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const margin = { left: 52, right: 18, top: 18, bottom: 42 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  const rows = matrix ? matrix.length : 44;
  const cols = matrix ? matrix[0].length : 72;
  const cellW = plotW / cols;
  const cellH = plotH / rows;
  lastSpectrogram = { margin, plotW, plotH, matrix, durationSeconds: matrix?.durationSeconds || 240 };
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const energy = matrix ? matrix[r][c] : 0;
      ctx.fillStyle = heatColor(energy);
      ctx.fillRect(margin.left + c * cellW, margin.top + r * cellH, cellW + 0.4, cellH + 0.4);
    }
  }

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(margin.left, margin.top, plotW, plotH);
  ctx.font = '12px Microsoft YaHei, Arial';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';
  [0, 10, 20, 30, 40].forEach((freq) => {
    const y = margin.top + plotH - (freq / 40) * plotH;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.24)';
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotW, y); ctx.stroke();
    ctx.fillText(`${freq} Hz`, margin.left - 8, y + 4);
  });
  ctx.textAlign = 'center';
  [0, 60, 120, 180, 240].forEach((sec) => {
    const x = margin.left + (sec / 240) * plotW;
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.18)';
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotH); ctx.stroke();
    ctx.fillText(`${sec}s`, x, margin.top + plotH + 22);
  });
  const highBand = findHighEnergyBand(matrix);
  if (highBand) {
    const x1 = margin.left + (highBand.startColumn / cols) * plotW;
    const x2 = margin.left + ((highBand.endColumn + 1) / cols) * plotW;
    const y1 = margin.top + plotH - (highBand.highFreq / 40) * plotH;
    const y2 = margin.top + plotH - (highBand.lowFreq / 40) * plotH;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'left';
    ctx.fillText(`高能频带 ${highBand.lowFreq}-${highBand.highFreq} Hz`, x1 + 6, Math.max(14, y1 - 6));
  }
  drawBandGuide(ctx, margin, plotW, plotH);
  ctx.save();
  ctx.fillStyle = '#334155';
  ctx.font = '12px Microsoft YaHei, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Time (s)', margin.left + plotW / 2, height - 6);
  ctx.translate(14, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Frequency (Hz)', 0, 0);
  ctx.restore();
}

function appendChainItem(stepIndex, text) {
  setActiveStep(stepIndex);
  const li = document.createElement('li');
  li.textContent = text;
  li.dataset.step = String(stepIndex);
  resultChain.appendChild(li);
}

function completeChainStep(stepIndex, text) {
  const matches = Array.from(resultChain.querySelectorAll(`li[data-step="${stepIndex}"]`));
  const li = matches[matches.length - 1];
  if (li) {
    li.textContent = text;
    li.classList.add('done');
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseEdfFile(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const headerBytes = parseInt(readAscii(view, 184, 8), 10);
  const rawRecords = parseInt(readAscii(view, 236, 8), 10);
  const recordDuration = parseFloat(readAscii(view, 244, 8)) || 1;
  const channels = parseInt(readAscii(view, 252, 4), 10);
  if (!Number.isFinite(headerBytes) || headerBytes < 256 || !channels || channels < 1) {
    throw new Error(`${file.name} 不是有效 EDF 文件：header 解析失败`);
  }
  const labels = readFieldList(view, 256, channels, 16);
  const physicalMin = readNumberList(view, 256 + channels * 104, channels, 8);
  const physicalMax = readNumberList(view, 256 + channels * 112, channels, 8);
  const digitalMin = readNumberList(view, 256 + channels * 120, channels, 8);
  const digitalMax = readNumberList(view, 256 + channels * 128, channels, 8);
  const samplesPerRecord = readNumberList(view, 256 + channels * 216, channels, 8).map((n) => Math.max(1, Math.round(n || 1)));
  const recordBytes = samplesPerRecord.reduce((sum, count) => sum + count * 2, 0);
  const availableRecords = Math.max(1, Math.floor((buffer.byteLength - headerBytes) / Math.max(1, recordBytes)));
  const records = rawRecords > 0 ? Math.min(rawRecords, availableRecords) : availableRecords;
  const channelIndex = chooseEegChannel(labels);
  const sampleRate = samplesPerRecord[channelIndex] / recordDuration;
  const maxSamples = Math.min(120000, Math.max(2048, samplesPerRecord[channelIndex] * Math.min(records || 1, 80)));
  const channelRecordOffset = samplesPerRecord.slice(0, channelIndex).reduce((sum, count) => sum + count * 2, 0);
  const signal = [];
  for (let record = 0; record < records && signal.length < maxSamples; record += 1) {
    const recordStart = headerBytes + record * recordBytes + channelRecordOffset;
    const count = samplesPerRecord[channelIndex];
    for (let i = 0; i < count && signal.length < maxSamples; i += 1) {
      const offset = recordStart + i * 2;
      const digital = offset + 2 <= buffer.byteLength ? view.getInt16(offset, true) : 0;
      const scaled = scaleDigital(digital, digitalMin[channelIndex], digitalMax[channelIndex], physicalMin[channelIndex], physicalMax[channelIndex]);
      signal.push(scaled);
    }
  }
  if (signal.length < 128) throw new Error(`${file.name} 可分析采样点不足`);
  return {
    name: file.name,
    size: file.size,
    channels,
    channelLabel: labels[channelIndex] || `ch${channelIndex + 1}`,
    sampleRate,
    durationSeconds: signal.length / sampleRate,
    signal
  };
}

function readAscii(view, start, length) {
  let text = '';
  for (let i = start; i < start + length && i < view.byteLength; i += 1) text += String.fromCharCode(view.getUint8(i));
  return text.trim();
}

function readFieldList(view, start, channels, width) {
  return Array.from({ length: channels }, (_, i) => readAscii(view, start + i * width, width));
}

function readNumberList(view, start, channels, width) {
  return readFieldList(view, start, channels, width).map((value) => Number.parseFloat(value));
}

function chooseEegChannel(labels) {
  const idx = labels.findIndex((label) => /fp|f3|f4|c3|c4|t3|t4|cz|pz|o1|o2/i.test(label));
  return idx >= 0 ? idx : 0;
}

function scaleDigital(value, dMin, dMax, pMin, pMax) {
  if (!Number.isFinite(dMin) || !Number.isFinite(dMax) || dMax === dMin) return value;
  if (!Number.isFinite(pMin) || !Number.isFinite(pMax)) return value;
  return ((value - dMin) / (dMax - dMin)) * (pMax - pMin) + pMin;
}

function preprocessSignal(signal) {
  const mean = signal.reduce((sum, value) => sum + value, 0) / signal.length;
  const centered = signal.map((value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value * value, 0) / centered.length;
  const std = Math.sqrt(variance) || 1;
  const normalized = centered.map((value) => value / std);
  return normalized.map((value, i) => {
    const prev = normalized[Math.max(0, i - 1)];
    const next = normalized[Math.min(normalized.length - 1, i + 1)];
    return (prev + value * 2 + next) / 4;
  });
}

function extractFeatures(signal, sampleRate) {
  const rms = Math.sqrt(signal.reduce((sum, value) => sum + value * value, 0) / signal.length);
  const lineLength = signal.slice(1).reduce((sum, value, i) => sum + Math.abs(value - signal[i]), 0) / signal.length;
  const zeroCrossingRate = signal.slice(1).filter((value, i) => Math.sign(value) !== Math.sign(signal[i])).length / signal.length;
  const spectrum = computeSpectrum(signal.slice(0, Math.min(signal.length, 4096)), sampleRate);
  const theta = bandPower(spectrum, 4, 8);
  const alpha = bandPower(spectrum, 8, 13);
  const beta = bandPower(spectrum, 13, 30);
  const total = bandPower(spectrum, 1, 40) || 1;
  const spectralEntropy = entropy(spectrum.map((bin) => bin.power / total));
  const diff = signal.slice(1).map((value, i) => value - signal[i]);
  const mobility = Math.sqrt(variance(diff) / (variance(signal) || 1));
  return { rms, lineLength, zeroCrossingRate, theta, alpha, beta, thetaRatio: theta / total, betaRatio: beta / total, thetaBetaRatio: theta / (beta || 1e-6), spectralEntropy, hjorthMobility: mobility };
}

function computeSpectrum(signal, sampleRate) {
  const n = Math.min(1024, signal.length);
  const bins = [];
  for (let k = 1; k <= Math.min(80, Math.floor(n / 2)); k += 1) {
    let real = 0;
    let imag = 0;
    for (let t = 0; t < n; t += 1) {
      const angle = (2 * Math.PI * k * t) / n;
      const windowed = signal[t] * (0.54 - 0.46 * Math.cos((2 * Math.PI * t) / (n - 1)));
      real += windowed * Math.cos(angle);
      imag -= windowed * Math.sin(angle);
    }
    bins.push({ frequency: (k * sampleRate) / n, power: (real * real + imag * imag) / n });
  }
  return bins;
}

function bandPower(spectrum, low, high) {
  return spectrum.filter((bin) => bin.frequency >= low && bin.frequency < high).reduce((sum, bin) => sum + bin.power, 0);
}

function entropy(values) {
  return -values.filter((value) => value > 0).reduce((sum, value) => sum + value * Math.log2(value), 0);
}

function variance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
}

function predictSeizure(features) {
  const score = 0.36 * normalizeScore(features.thetaBetaRatio, 0.6, 4.2) +
    0.24 * normalizeScore(features.lineLength, 0.08, 0.42) +
    0.2 * normalizeScore(features.rms, 0.55, 1.4) +
    0.2 * (1 - normalizeScore(features.spectralEntropy, 2.2, 5.3));
  const probability = Math.max(0.02, Math.min(0.98, score));
  return { probability, label: probability >= 0.5 ? 'Seizure' : 'Non-seizure', threshold: 0.5 };
}

function normalizeScore(value, min, max) {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function renderAnalysisResults(results) {
  const summary = summarizeBatch(results);
  drawWaveform(true, results[0]?.signal);
  const matrix = computeSpectrogram(results[0].signal, results[0].sampleRate);
  matrix.durationSeconds = results[0].durationSeconds;
  drawSpectrogram(matrix);
  probability.textContent = summary.meanProbability.toFixed(2);
  featureRows.innerHTML = `
    <tr><td>EDF 文件数</td><td>${results.length}</td></tr>
    <tr><td>平均 RMS</td><td>${summary.meanRms.toFixed(3)}</td></tr>
    <tr><td>平均 θ/β</td><td>${summary.meanThetaBeta.toFixed(3)}</td></tr>
    <tr><td>平均谱熵</td><td>${summary.meanEntropy.toFixed(3)}</td></tr>
    <tr><td>平均发作概率</td><td>${summary.meanProbability.toFixed(3)}</td></tr>
  `;
  fileResultRows.innerHTML = results.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.channelLabel)} / ${item.channels}</td>
      <td>${item.features.rms.toFixed(3)}</td>
      <td>${item.features.thetaBetaRatio.toFixed(3)}</td>
      <td>${item.prediction.probability.toFixed(3)}</td>
      <td>${item.prediction.label}</td>
    </tr>
  `).join('');
}

function summarizeBatch(results) {
  const avg = (selector) => results.reduce((sum, item) => sum + selector(item), 0) / Math.max(1, results.length);
  return {
    fileCount: results.length,
    meanRms: avg((item) => item.features.rms),
    meanThetaBeta: avg((item) => item.features.thetaBetaRatio),
    meanEntropy: avg((item) => item.features.spectralEntropy),
    meanProbability: avg((item) => item.prediction.probability)
  };
}

function computeSpectrogram(signal, sampleRate) {
  const windowSize = Math.min(256, Math.max(64, Math.floor(sampleRate * 2)));
  const hop = Math.max(32, Math.floor(windowSize / 3));
  const columns = [];
  for (let start = 0; start + windowSize <= signal.length && columns.length < 96; start += hop) {
    const segment = signal.slice(start, start + windowSize);
    const spectrum = computeSpectrum(segment, sampleRate).filter((bin) => bin.frequency <= 40);
    columns.push(spectrum);
  }
  if (!columns.length) columns.push(computeSpectrum(signal, sampleRate).filter((bin) => bin.frequency <= 40));
  const rows = 40;
  const matrix = Array.from({ length: rows }, () => Array(columns.length).fill(0));
  let max = 0;
  for (let c = 0; c < columns.length; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const low = r;
      const high = r + 1;
      const power = bandPower(columns[c], low, high);
      matrix[rows - 1 - r][c] = Math.log10(power + 1e-8);
      max = Math.max(max, matrix[rows - 1 - r][c]);
    }
  }
  const min = Math.min(...matrix.flat());
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns.length; c += 1) {
      matrix[r][c] = (matrix[r][c] - min) / ((max - min) || 1);
    }
  }
  return matrix;
}

function findHighEnergyBand(matrix) {
  if (!matrix || !matrix.length) return null;
  let best = { score: 0, row: 0, col: 0 };
  for (let r = 0; r < matrix.length; r += 1) {
    for (let c = 0; c < matrix[r].length; c += 1) {
      if (matrix[r][c] > best.score) best = { score: matrix[r][c], row: r, col: c };
    }
  }
  const freq = Math.round((1 - best.row / matrix.length) * 40);
  return {
    lowFreq: Math.max(1, freq - 3),
    highFreq: Math.min(40, freq + 3),
    startColumn: Math.max(0, best.col - 6),
    endColumn: Math.min(matrix[0].length - 1, best.col + 6)
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function drawBandGuide(ctx, margin, plotW, plotH) {
  const bands = [
    { label: 'theta 4-8Hz', freq: 8 },
    { label: 'alpha 8-13Hz', freq: 13 },
    { label: 'beta 13-30Hz', freq: 30 }
  ];
  ctx.save();
  ctx.font = '10px Microsoft YaHei, Arial';
  ctx.textAlign = 'left';
  bands.forEach((band) => {
    const y = margin.top + plotH - (band.freq / 40) * plotH;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotW, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillText(band.label, margin.left + plotW - 92, y - 4);
  });
  ctx.restore();
}

function heatColor(value) {
  const stops = [
    [15, 23, 42],
    [30, 64, 175],
    [6, 182, 212],
    [249, 115, 22],
    [253, 224, 71]
  ];
  const scaled = value * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const t = scaled - idx;
  const color = stops[idx].map((channel, i) => Math.round(channel + (stops[idx + 1][i] - channel) * t));
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

spectrogramCanvas.addEventListener('mousemove', (event) => {
  const rect = spectrogramCanvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (spectrogramCanvas.width / rect.width);
  const y = (event.clientY - rect.top) * (spectrogramCanvas.height / rect.height);
  const margin = { left: 52, right: 18, top: 18, bottom: 42 };
  const plotW = spectrogramCanvas.width - margin.left - margin.right;
  const plotH = spectrogramCanvas.height - margin.top - margin.bottom;
  if (x < margin.left || x > margin.left + plotW || y < margin.top || y > margin.top + plotH) {
    spectrogramReadout.textContent = '悬停查看 Time / Frequency / Power';
    return;
  }
  const time = ((x - margin.left) / plotW) * (lastSpectrogram?.durationSeconds || 240);
  const freq = (1 - (y - margin.top) / plotH) * 40;
  const matrix = lastSpectrogram?.matrix;
  const col = matrix ? Math.min(matrix[0].length - 1, Math.max(0, Math.floor(((x - margin.left) / plotW) * matrix[0].length))) : 0;
  const row = matrix ? Math.min(matrix.length - 1, Math.max(0, Math.floor(((y - margin.top) / plotH) * matrix.length))) : 0;
  const normalizedPower = matrix ? matrix[row][col] : 0;
  const power = -30 + normalizedPower * 40;
  spectrogramReadout.textContent = `Time ${time.toFixed(1)}s · Frequency ${freq.toFixed(1)}Hz · Power ${power.toFixed(1)} dB`;
});

spectrogramCanvas.addEventListener('mouseleave', () => {
  spectrogramReadout.textContent = '悬停查看 Time / Frequency / Power';
});
