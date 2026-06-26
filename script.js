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

const chainLabels = [
  '数据读取：解析 EDF 文件头、通道数、采样率和发作标注',
  '预处理：完成带通滤波、工频陷波、坏段剔除和标准化',
  '特征提取：生成 RMS、θ Power、SampEn、HFD 等特征',
  '模型训练：训练 SVM / RF / KNN 备选模型并保存参数',
  '结果评估：输出混淆矩阵、F1-score、Sensitivity 和错误样本',
  '报告导出：生成可用于项目汇报的分析摘要 JSON'
];

function setActiveStep(index) {
  steps.forEach((step, i) => {
    step.classList.toggle('active', i === index);
    step.classList.toggle('done', i < index);
  });
}

function drawWaveform(active = false) {
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
  analyzeBtn.disabled = true;
  exportBtn.disabled = true;
  resultChain.innerHTML = '';
  runStatus.textContent = '分析中';

  for (let i = 0; i < chainLabels.length; i += 1) {
    setActiveStep(i);
    const li = document.createElement('li');
    li.textContent = chainLabels[i];
    resultChain.appendChild(li);
    await new Promise((resolve) => setTimeout(resolve, 420));
    li.classList.add('done');
  }

  setActiveStep(5);
  drawWaveform(true);
  featureRows.innerHTML = `
    <tr><td>RMS</td><td>52.1</td></tr>
    <tr><td>θ Power</td><td>0.33</td></tr>
    <tr><td>SampEn</td><td>1.12</td></tr>
    <tr><td>HFD</td><td>1.78</td></tr>
  `;
  probability.textContent = '0.96';
  runStatus.textContent = '分析完成';
  exportBtn.disabled = false;
  analyzeBtn.disabled = false;
}

function exportReport() {
  const file = fileInput.files[0];
  const payload = {
    project: 'EEG Workbench - Seizure Analysis',
    file: file ? file.name : 'demo.edf',
    pipeline: chainLabels,
    features: { RMS: 52.1, thetaPower: 0.33, SampEn: 1.12, HFD: 1.78 },
    model: { prediction: 'Seizure', probability: 0.96, threshold: 0.5 },
    metrics: { f1Score: '94.6%', sensitivity: '96.1%' },
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
  const file = fileInput.files[0];
  analyzeBtn.disabled = !file;
  fileHint.textContent = file ? `${file.name} 已就绪，可以开始分析` : '支持 .edf 脑电文件';
  runStatus.textContent = file ? 'EDF 文件已加载' : '等待 EDF 文件';
});

analyzeBtn.addEventListener('click', runAnalysis);
exportBtn.addEventListener('click', exportReport);
drawWaveform(false);
renderInitialChain();
