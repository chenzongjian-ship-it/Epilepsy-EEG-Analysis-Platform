# 癫痫脑电分析平台 EEG Workbench

这是一个用于课程项目展示的癫痫脑电分析平台前端原型。平台围绕 CHB-MIT 等 EDF 脑电数据的分析流程，支持批量 EDF 文件上传，展示从数据读取到报告导出的完整结果链，适合放入 GitHub 仓库作为项目主页和作品展示入口。

## 直接进入平台

如果本仓库已开启 GitHub Pages，可以通过以下地址访问平台：

```text
https://你的GitHub用户名.github.io/你的仓库名/
```

上传本项目文件后，在仓库的 `Settings -> Pages` 中选择：

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

启用后，GitHub 会生成可直接访问的 Pages 链接。

## 项目简介

本平台用于展示癫痫脑电信号自动分析的核心流程。用户批量上传 EDF 文件后，页面会模拟执行以下链路：

1. 数据读取：解析 EDF 文件、采样率、通道信息和发作标注。
2. 预处理：进行滤波、去噪、坏段剔除和标准化。
3. 特征提取：计算 RMS、θ Power、SampEn、HFD 等脑电特征。
4. 模型训练：展示 SVM、RF、KNN/XGBoost 等模型训练流程。
5. 结果评估：输出发作概率、F1-score、Sensitivity 等指标。
6. 报告导出：生成可下载的分析摘要 JSON。

## 解决的问题

癫痫脑电分析通常涉及 EDF 数据读取、信号预处理、特征工程、模型训练和结果解释多个步骤。传统展示方式容易把这些步骤拆散，难以体现完整实验链路。本平台将这些模块整合到一个可交互页面中，用于直观展示项目流程、分析结果和最终报告。

## 功能模块

| 模块 | 说明 |
| --- | --- |
| 数据导入 | 批量上传 EDF 脑电文件，触发分析流程 |
| 预处理 | 展示原始/滤波 EEG 波形 |
| 特征提取 | 展示 RMS、θ Power、SampEn、HFD 等特征，并提供带坐标轴的时频热力图 |
| 模型训练 | 展示发作识别模型输出 |
| 结果评估 | 展示 F1-score、Sensitivity 等指标 |
| 报告导出 | 导出 `eeg-analysis-report.json` |

## 页面预览

平台界面包含左侧功能导航区、中间 EDF 批量上传区、文件队列、流程进度条、波形图、带时间轴和频率轴的时频热力图、Power(dB) 颜色条、EEG 频段参考线、特征表、模型输出和识别报告区。

本地打开方式：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/
```

## 文件结构

```text
.
├── index.html
├── styles.css
├── script.js
├── README.md
├── PROJECT_OVERVIEW.md
├── GITHUB_PAGES_GUIDE.md
└── .nojekyll
```

## 后续扩展

- 接入 Python 后端，调用真实 EDF 读取与 MNE/PyEDFlib 预处理脚本。
- 接入真实模型文件，输出实际预测结果。
- 扩展批量 EDF 文件真实后端分析与批量报告生成。
- 导出 Word/PDF 项目报告。
- 将模型指标、实验参数和图表自动同步到 GitHub 仓库。

## 仓库描述建议

```text
癫痫脑电 EDF 分析平台前端原型：串联数据读取、预处理、特征提取、模型训练、结果评估和报告导出。
```
