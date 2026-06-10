const fallbackReports = {
  updatedAt: "2026-06-11T00:00:00+08:00",
  timezone: "Asia/Shanghai",
  reports: [
    {
      id: "mexico-south-africa-2026-06-12",
      competition: "World Cup Group A",
      homeTeam: "Mexico",
      awayTeam: "South Africa",
      kickoffLocal: "2026-06-11 13:00 Mexico City",
      kickoffBeijing: "2026-06-12 03:00 Beijing",
      venue: "Estadio Azteca / Mexico City Stadium",
      recommendation: "Mexico win, prefer low-score script",
      probabilities: { home: 58, draw: 25, away: 17 },
      scorePrediction: "1-0 / 2-0 / 1-1",
      snapshot: [
        "Highest priority signal: verify starting goalkeeper, center-back pair, holding midfielder, and striker in the final 60-90 minutes before kickoff.",
        "Home altitude edge still supports Mexico, but a cautious setup or rotation in the front line lowers the ceiling for a two-goal margin.",
        "Handicap, water, and totals should be read together; if only the handicap rises while totals stay flat, the cover probability is weaker than the headline move suggests.",
        "Current score model still favors a low-event match script unless confirmed lineups and late market action point to a faster tempo."
      ],
      news: [
        "Add official lineups and bench lists as a required late update; this is the single biggest upgrade for win and score prediction accuracy.",
        "Track coach comments for conservative game-plan language, rotation hints, travel fatigue, or altitude adaptation concerns.",
        "Any late change in goalkeeper, lead center-back, single pivot, or main striker should trigger an immediate downgrade in model confidence and a reset on total goals.",
        "Beyond standard injuries, monitor travel delays, illness, warm-up withdrawals, and soft-tissue management decisions."
      ],
      marketRead: "Base case remains Mexico on a shallow handicap. If the market sits at Mexico -0.75 with home-side low water, the handicap broadly matches the fundamental edge. If the line moves to -1 while totals remain around 2.25 or 2.5, the market is pricing win probability more than blowout probability. If it stretches to -1.25 without a matching rise in totals, that is more likely heat than fresh edge. The present score band still fits 1-0, 2-0, and 1-1 better than wider-margin outcomes.",
      marketMovement: "Track whether Asian handicap, 1X2, and totals move in the same direction. If the favorite keeps dropping in water without another line increase, demand may be overheated. If late money pushes the win price down while totals stay suppressed, the market may overprice result certainty but not goal volume.",
      lineup: [
        "Must-check positions: starting goalkeeper, first-choice center-back pair, number-6 role, and lone striker.",
        "For Mexico, confirm spine stability and whether the holding midfielder and striker are both available from the start.",
        "For South Africa, confirm goalkeeper, starting center-backs, and the main transition runner.",
        "If the official shape shifts into a more defensive structure, total-goal expectation should be revised downward immediately."
      ],
      formData: [
        "Keep recent results, but add xG, xGA, box shots, shots on target allowed, set-piece xG, and transition creation as standard inputs.",
        "If Mexico's recent scoring burst came mainly against weak opposition, deep handicap value should be cut even if headline form looks strong.",
        "Score modeling should weigh game-state behavior after scoring first and after conceding first.",
        "If South Africa posted clean sheets mostly against limited attacks and still struggles against high pressure in build-up, 1-0 and 2-0 stay the most coherent home-win scores."
      ],
      factors: [
        "Motivation should be described in detail: qualification math, goal-difference pressure, and whether a draw is acceptable for either side.",
        "Weather should include real temperature, humidity, wind, and pitch condition because hot or heavy conditions often suppress tempo and finishing quality.",
        "Travel and recovery should record time-zone change, arrival timing, rest days, and recent starter minutes because these often decide second-half energy.",
        "Referee style should include card rate, penalty frequency, and foul tolerance because it changes set-piece volume and tail-risk in scorelines.",
        "Matchup edges matter more than generic form: wing pace versus recovery speed, aerial strength, set-piece attack versus defense, and transition defense."
      ],
      modelNote: "The report now carries five extra prediction levers inside the existing schema: confirmed lineup signal, xG quality, set-piece edge, referee style, and travel recovery. Fundamentals still support Mexico on the result line, but value depends on late lineup integrity and whether the market overheats.",
      risk: "Main risk is not the raw result call but the price paid for it. If the favorite becomes crowded, the line rises on weak support, or the coach signals control over aggression, Mexico may win by only one or drift into a 1-1 path.",
      sources: [
        { label: "FIFA schedule", url: "https://www.fifa.com/" },
        { label: "Mexico federation", url: "https://miseleccion.mx/" },
        { label: "South Africa federation", url: "https://www.safa.net/" },
        { label: "OddsPortal market reference", url: "https://www.oddsportal.com/" },
        { label: "Flashscore match data", url: "https://www.flashscore.com/" },
        { label: "Weather reference", url: "https://weather.com/" }
      ]
    }
  ]
};

const state = {
  reports: [],
  filter: "all"
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai"
});

const signalDefinitions = [
  {
    key: "lineup",
    title: "Lineup confirmation",
    helper: "Late XI changes shift both win rate and score ceiling the fastest.",
    keywords: ["lineup", "starting", "starter", "goalkeeper", "keeper", "center-back", "midfielder", "striker", "warm-up", "injur", "suspens", "rotation", "首发", "门将", "中卫", "后腰", "中锋", "伤停", "停赛", "轮换"]
  },
  {
    key: "xg",
    title: "xG and shot quality",
    helper: "Use chance quality, not only recent results, to anchor the scoreline.",
    keywords: ["xg", "xga", "box shots", "shots on target", "chance", "finishing", "transition", "build-up", "禁区", "射门", "射正", "机会", "反击"]
  },
  {
    key: "setpiece",
    title: "Set-piece edge",
    helper: "Dead-ball advantage often decides 1-goal matches and low totals.",
    keywords: ["set-piece", "set piece", "corner", "free kick", "aerial", "penalty", "定位球", "角球", "任意球", "高空球", "头球"]
  },
  {
    key: "referee",
    title: "Referee style",
    helper: "Cards, fouls, and penalty tendency change volatility and totals.",
    keywords: ["referee", "card", "penalty", "foul", "discipline", "yellow", "red", "裁判", "黄牌", "红牌", "点球", "犯规"]
  },
  {
    key: "travel",
    title: "Weather and recovery",
    helper: "Temperature, humidity, altitude, and travel load change second-half energy.",
    keywords: ["travel", "recovery", "altitude", "weather", "humidity", "wind", "pitch", "rest", "time-zone", "arrival", "fatigue", "旅途", "恢复", "海拔", "天气", "湿度", "风速", "草皮", "休息"]
  },
  {
    key: "market",
    title: "Market heat",
    helper: "Look for disagreement between handicap, water, totals, and 1X2.",
    keywords: ["market", "handicap", "water", "1x2", "totals", "odds", "price", "overheated", "trap", "让球", "盘口", "水位", "赔率", "大小球", "过热", "诱盘"]
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
    .split(/(?<=[.!?])\s+|\n+/)
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
  const date = report.kickoffBeijing?.slice(0, 10);
  const now = new Date();
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(tomorrowDate);

  if (date === today) return "today";
  if (date === tomorrow) return "tomorrow";
  return "other";
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
    node.querySelector(".competition").textContent = report.competition || "World Cup";
    node.querySelector(".match-title").textContent = `${report.homeTeam} vs ${report.awayTeam}`;
    node.querySelector(".kickoff").textContent = `${report.kickoffBeijing || ""} | ${report.venue || ""}`;
    node.querySelector(".pick").textContent = report.recommendation || "Await market";
    node.querySelector(".home-win").textContent = toPercent(report.probabilities?.home);
    node.querySelector(".draw").textContent = toPercent(report.probabilities?.draw);
    node.querySelector(".away-win").textContent = toPercent(report.probabilities?.away);
    node.querySelector(".score").textContent = report.scorePrediction || "-";
    node.querySelector(".snapshot").innerHTML = textList(report.snapshot);
    node.querySelector(".news").innerHTML = textList(report.news);
    node.querySelector(".market").textContent = report.marketRead || "No market read yet.";
    node.querySelector(".market-movement").textContent = report.marketMovement || "No market movement yet.";
    node.querySelector(".lineup").innerHTML = textList(report.lineup);
    node.querySelector(".form-data").innerHTML = textList(report.formData);
    node.querySelector(".factors").innerHTML = textList(report.factors);
    node.querySelector(".model-note").textContent = report.modelNote || "No model note yet.";
    node.querySelector(".risk").textContent = report.risk || "No risk note yet.";

    const sourceHtml = (report.sources || [])
      .map(
        (source) => `
          <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
            ${escapeHtml(source.label)}
          </a>
        `
      )
      .join("");

    node.querySelector(".sources").innerHTML = sourceHtml || "<span>No source links yet.</span>";
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
  const updated = payload.updatedAt
    ? dateFormatter.format(new Date(payload.updatedAt))
    : "No timestamp";
  document.querySelector("#updatedAt").textContent = `Updated ${updated} CST`;
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
