const fallbackReports = {
  updatedAt: "2026-06-12T00:00:00+08:00",
  timezone: "Asia/Shanghai",
  reports: []
};

const state = {
  reports: [],
  filter: "all"
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai"
});

const signalDefinitions = [
  {
    title: "官方比赛状态",
    helper: "优先看 FIFA 官方赛程、开球时间、实时比分与比赛状态。",
    keywords: ["比赛状态", "当前比分", "实时比分", "进行中", "已结束", "未开赛", "match", "score", "live"]
  },
  {
    title: "逐场相关新闻",
    helper: "逐场新闻比通用预览更有价值，优先看和本场直接相关的 FIFA 新闻。",
    keywords: ["FIFA 新闻", "live stream", "team news", "preview", "highlights", "injury", "news", "新闻"]
  },
  {
    title: "盘口验证状态",
    helper: "没有抓到可验证盘口时，不输出伪分析，直接标记盘口待接入。",
    keywords: ["盘口", "水位", "亚洲盘", "1x2", "大小球", "market", "odds", "handicap"]
  },
  {
    title: "裁判与场地",
    helper: "裁判、球场、城市、天气和观众数会直接影响临场强度和比赛节奏。",
    keywords: ["裁判", "场地", "天气", "现场人数", "referee", "stadium", "weather", "attendance"]
  },
  {
    title: "首发与伤停",
    helper: "如果没有官方首发和伤停，不应强行输出具体让球结论。",
    keywords: ["首发", "伤停", "阵容", "门将", "中卫", "lineup", "injury", "starting"]
  },
  {
    title: "风险提示",
    helper: "如果盘口源缺失或伤停不明，最合理的动作就是降低判断强度。",
    keywords: ["风险", "回避", "偏差", "风险提示", "risk"]
  }
];

function toPercent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textList(items) {
  return (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function sentenceSplit(text) {
  return String(text || "")
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectReportText(report) {
  return [
    ...(report.snapshot || []),
    ...(report.news || []),
    report.marketRead || "",
    report.marketMovement || "",
    ...(report.lineup || []),
    ...(report.formData || []),
    ...(report.factors || []),
    report.modelNote || "",
    report.risk || ""
  ].filter(Boolean);
}

function findBestSignalMatch(report, definition) {
  const entries = collectReportText(report);
  const loweredKeywords = definition.keywords.map((keyword) => keyword.toLowerCase());

  for (const entry of entries) {
    const sentences = sentenceSplit(entry);
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (loweredKeywords.some((keyword) => lower.includes(keyword))) {
        return sentence;
      }
    }
  }

  return definition.helper;
}

function buildSignals(report) {
  return signalDefinitions.map((definition) => ({
    title: definition.title,
    summary: findBestSignalMatch(report, definition)
  }));
}

function classifyReport(report) {
  return report.status || "upcoming";
}

function renderSignals(report, root) {
  const signalGrid = root.querySelector(".signal-grid");
  signalGrid.innerHTML = buildSignals(report)
    .map(
      (signal) => `
        <article class="signal-card">
          <p class="signal-title">${escapeHtml(signal.title)}</p>
          <p class="signal-summary">${escapeHtml(signal.summary)}</p>
        </article>
      `
    )
    .join("");
}

function render(reports) {
  const container = document.querySelector("#reports");
  const empty = document.querySelector("#emptyState");
  const template = document.querySelector("#reportTemplate");
  container.innerHTML = "";

  const filtered = reports.filter((report) => {
    if (state.filter === "all") return true;
    return classifyReport(report) === state.filter;
  });

  empty.hidden = filtered.length > 0;

  filtered.forEach((report) => {
    const node = template.content.cloneNode(true);
    node.querySelector(".competition").textContent = report.competition || "世界杯";
    const homeTeam = report.homeTeam || "待定";
    const awayTeam = report.awayTeam || "待定";
    node.querySelector(".match-title").textContent =
      homeTeam === "待定" && awayTeam === "待定" ? "对阵待定" : `${homeTeam} 对阵 ${awayTeam}`;
    node.querySelector(".kickoff").textContent = `${report.kickoffBeijing || ""} | ${report.venue || ""}`;
    node.querySelector(".match-status").textContent = report.statusLabel || "状态待确认";
    node.querySelector(".current-score").textContent = report.currentScore || "暂无比分";
    node.querySelector(".pick").textContent = report.recommendation || "等待盘口";
    node.querySelector(".home-win").textContent = toPercent(report.probabilities?.home);
    node.querySelector(".draw").textContent = toPercent(report.probabilities?.draw);
    node.querySelector(".away-win").textContent = toPercent(report.probabilities?.away);
    node.querySelector(".score").textContent = report.scorePrediction || "-";
    node.querySelector(".snapshot").innerHTML = textList(report.snapshot);
    node.querySelector(".news").innerHTML = textList(report.news);
    node.querySelector(".market").textContent = report.marketRead || "暂无盘口解读。";
    node.querySelector(".market-movement").textContent = report.marketMovement || "暂无盘口变化信息。";
    node.querySelector(".lineup").innerHTML = textList(report.lineup);
    node.querySelector(".form-data").innerHTML = textList(report.formData);
    node.querySelector(".factors").innerHTML = textList(report.factors);
    node.querySelector(".model-note").textContent = report.modelNote || "暂无模型判断。";
    node.querySelector(".risk").textContent = report.risk || "暂无风险提示。";

    const sourceHtml = (report.sources || [])
      .map(
        (source) => `
          <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
            ${escapeHtml(source.label)}
          </a>
        `
      )
      .join("");

    node.querySelector(".sources").innerHTML = sourceHtml || "<span>暂无来源链接。</span>";
    renderSignals(report, node);
    container.appendChild(node);
  });
}

async function loadReports() {
  let payload = fallbackReports;

  try {
    const response = await fetch("data/reports.json", { cache: "no-store" });
    if (response.ok) {
      payload = await response.json();
    }
  } catch (error) {
    console.warn("Using fallback reports", error);
  }

  state.reports = payload.reports || [];
  const updated = payload.updatedAt ? dateFormatter.format(new Date(payload.updatedAt)) : "暂无时间";
  document.querySelector("#updatedAt").textContent = `更新于 ${updated}`;
  document.querySelector("#coverageText").textContent = `覆盖全部世界杯比赛，共 ${state.reports.length} 场`;
  render(state.reports);
}

document.querySelectorAll(".seg").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".seg").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    render(state.reports);
  });
});

loadReports();
