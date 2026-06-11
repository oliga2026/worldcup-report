import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = __dirname;
const reportsPath = path.join(repoRoot, "data", "reports.json");

const UPCOMING_HOURS_FOR_ENRICH = Number(process.env.WORLDCUP_LOOKAHEAD_HOURS || "36");
const WIKI_MAIN_URL =
  process.env.WORLDCUP_WIKI_MAIN_URL || "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup";
const GROUP_LETTERS = "ABCDEFGHIJKL".split("");
const GROUP_URLS = GROUP_LETTERS.map((letter) => ({
  letter,
  url: `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_${letter}`
}));

const MARKETS_FILE = path.join(repoRoot, "data", "markets.override.json");
const FORM_FILE = path.join(repoRoot, "data", "form.override.json");
const LINEUP_FILE = path.join(repoRoot, "data", "lineups.override.json");

const TEAM_NAME_MAP = {
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Austria: "奥地利",
  Belgium: "比利时",
  "Bosnia and Herzegovina": "波黑",
  Brazil: "巴西",
  Cameroon: "喀麦隆",
  Canada: "加拿大",
  Chile: "智利",
  Colombia: "哥伦比亚",
  "Costa Rica": "哥斯达黎加",
  Croatia: "克罗地亚",
  Czechia: "捷克",
  Denmark: "丹麦",
  Ecuador: "厄瓜多尔",
  Egypt: "埃及",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Ghana: "加纳",
  Iran: "伊朗",
  Iraq: "伊拉克",
  Italy: "意大利",
  Japan: "日本",
  Jordan: "约旦",
  Mexico: "墨西哥",
  Morocco: "摩洛哥",
  Netherlands: "荷兰",
  "New Zealand": "新西兰",
  Nigeria: "尼日利亚",
  Norway: "挪威",
  Paraguay: "巴拉圭",
  Peru: "秘鲁",
  Poland: "波兰",
  Portugal: "葡萄牙",
  Qatar: "卡塔尔",
  "Republic of Ireland": "爱尔兰",
  "Saudi Arabia": "沙特阿拉伯",
  Senegal: "塞内加尔",
  Serbia: "塞尔维亚",
  "South Africa": "南非",
  "South Korea": "韩国",
  Spain: "西班牙",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  Tunisia: "突尼斯",
  Turkey: "土耳其",
  Türkiye: "土耳其",
  Ukraine: "乌克兰",
  "United States": "美国",
  Uruguay: "乌拉圭",
  Uzbekistan: "乌兹别克斯坦",
  Wales: "威尔士"
};

const VENUE_MAP = {
  "Estadio Azteca": { zh: "阿兹特克球场", cityZh: "墨西哥城", timezone: "America/Mexico_City", lat: 19.3029, lon: -99.1505 },
  "BMO Field": { zh: "BMO 球场", cityZh: "多伦多", timezone: "America/Toronto", lat: 43.6332, lon: -79.4186 },
  "BC Place": { zh: "卑诗体育馆", cityZh: "温哥华", timezone: "America/Vancouver", lat: 49.2768, lon: -123.1118 },
  "SoFi Stadium": { zh: "SoFi 球场", cityZh: "洛杉矶", timezone: "America/Los_Angeles", lat: 33.9535, lon: -118.3392 },
  "MetLife Stadium": { zh: "大都会人寿球场", cityZh: "纽约/新泽西", timezone: "America/New_York", lat: 40.8135, lon: -74.0745 },
  "Mercedes-Benz Stadium": { zh: "梅赛德斯-奔驰球场", cityZh: "亚特兰大", timezone: "America/New_York", lat: 33.7554, lon: -84.4008 },
  "AT&T Stadium": { zh: "AT&T 球场", cityZh: "达拉斯", timezone: "America/Chicago", lat: 32.7473, lon: -97.0945 },
  "NRG Stadium": { zh: "NRG 球场", cityZh: "休斯敦", timezone: "America/Chicago", lat: 29.6847, lon: -95.4107 },
  "Arrowhead Stadium": { zh: "箭头球场", cityZh: "堪萨斯城", timezone: "America/Chicago", lat: 39.0489, lon: -94.4839 },
  "Hard Rock Stadium": { zh: "硬石球场", cityZh: "迈阿密", timezone: "America/New_York", lat: 25.958, lon: -80.2389 },
  "Gillette Stadium": { zh: "吉列球场", cityZh: "波士顿", timezone: "America/New_York", lat: 42.0909, lon: -71.2643 },
  "Lincoln Financial Field": { zh: "林肯金融球场", cityZh: "费城", timezone: "America/New_York", lat: 39.9008, lon: -75.1675 },
  "Levi's Stadium": { zh: "李维斯球场", cityZh: "旧金山湾区", timezone: "America/Los_Angeles", lat: 37.403, lon: -121.97 },
  "Lumen Field": { zh: "流明球场", cityZh: "西雅图", timezone: "America/Los_Angeles", lat: 47.5952, lon: -122.3316 },
  "Estadio BBVA": { zh: "BBVA 球场", cityZh: "蒙特雷", timezone: "America/Monterrey", lat: 25.6692, lon: -100.2446 },
  "Estadio Akron": { zh: "阿克伦球场", cityZh: "瓜达拉哈拉", timezone: "America/Mexico_City", lat: 20.6829, lon: -103.4622 }
};

const MONTH_MAP = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11
};

function nowBeijing() {
  return new Date();
}

function formatIsoWithOffset(date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+08:00`;
}

function teamZh(name) {
  const normalized = String(name || "").trim();
  if (/^(Winner|Runner-up|Third)/i.test(normalized)) {
    return normalized
      .replace(/^Winner of Match (\d+)/i, "第$1场胜者")
      .replace(/^Winner Match (\d+)/i, "第$1场胜者")
      .replace(/^Winner Group ([A-L])/i, "$1组第一")
      .replace(/^Runner-up Group ([A-L])/i, "$1组第二")
      .replace(/^Third-place team ([A-L])/i, "$1组第三");
  }
  return TEAM_NAME_MAP[normalized] || normalized;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#8211;", "–")
    .replaceAll("&#8212;", "—")
    .replaceAll("&#8722;", "−");
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "));
}

function htmlToStructuredText(html) {
  return decodeHtml(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, content) => `\n${"#".repeat(Number(level))} ${stripTags(content).trim()}\n`)
      .replace(/<(br|\/p|\/div|\/tr|\/table|\/ul|\/ol|\/li|\/section)[^>]*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<td[^>]*>/gi, " ")
      .replace(/<th[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
  ).trim();
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "worldcup-report-bot/2.0",
      accept: "text/html,application/xhtml+xml,application/xml,text/plain,*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "worldcup-report-bot/2.0",
      accept: "application/json,text/plain,*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

function uniqueBy(items, keyFn) {
  const result = [];
  const seen = new Set();
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function parseKickoff(dateText, timeText, utcText) {
  const dateMatch = String(dateText).match(/([A-Z][a-z]+) (\d{1,2}), 2026/);
  const timeMatch = String(timeText).match(/(\d{1,2}):(\d{2}) (a|p)\.m\./i);
  const utcMatch = String(utcText).replace("−", "-").match(/(-?\d+)/);
  if (!dateMatch || !timeMatch || !utcMatch) return null;

  let hour = Number(timeMatch[1]) % 12;
  if (timeMatch[3].toLowerCase() === "p") hour += 12;
  const minute = Number(timeMatch[2]);
  const month = MONTH_MAP[dateMatch[1]];
  const day = Number(dateMatch[2]);
  const offset = Number(utcMatch[1]);
  return new Date(Date.UTC(2026, month, day, hour - offset, minute, 0));
}

function formatHuman(date, timeZone, suffix = "") {
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(date)
    .replaceAll("/", "-");
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function venueMeta(venueText = "") {
  for (const [key, value] of Object.entries(VENUE_MAP)) {
    if (venueText.includes(key)) return value;
  }
  return null;
}

function extractScore(block, home, away) {
  const escapedHome = home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedAway = away.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`${escapedHome}\\s+(\\d+)\\s*[–-]\\s*(\\d+)\\s+${escapedAway}`),
    new RegExp(`${escapedHome}\\s+(\\d+)\\s+(\\d+)\\s+${escapedAway}`)
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match) {
      return { home: Number(match[1]), away: Number(match[2]) };
    }
  }

  return null;
}

function inferStatus(kickoff, score) {
  const now = nowBeijing();
  if (score && now.getTime() - kickoff.getTime() > 3 * 60 * 60 * 1000) {
    return { code: "finished", label: "已结束" };
  }
  if (score && now >= kickoff) {
    return { code: "live", label: "进行中" };
  }
  if (now < kickoff) {
    return { code: "upcoming", label: "未开赛" };
  }
  if (now.getTime() - kickoff.getTime() <= 3 * 60 * 60 * 1000) {
    return { code: "live", label: "进行中" };
  }
  return { code: "finished", label: "已结束" };
}

function parseLineupBlock(block, teamName) {
  const managerMatch = block.match(/Manager:\s+([A-Za-zÀ-ÖØ-öø-ÿ.' -]+)/i);
  const players = Array.from(
    block.matchAll(/\b(?:GK|RB|CB|LB|RWB|LWB|DM|CM|RM|LM|AM|RW|LW|RF|LF|CF|ST|FW)\s+\d+\s+([A-Za-zÀ-ÖØ-öø-ÿ.' -]+)/g)
  )
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (!players.length && !managerMatch) return null;
  const starters = players.slice(0, 11).join("、");
  const manager = managerMatch ? managerMatch[1].trim() : "主帅待确认";
  return `${teamZh(teamName)}预计/已知首发参考：${starters || "首发名单待补"}。主帅：${manager}。`;
}

function parseGroupMatches(letter, text) {
  const competition = `世界杯 ${letter} 组`;
  const matches = [];
  const sectionRegex = /\n###\s+([^\n]+?)\n([\s\S]*?)(?=\n###\s+|\n##\s+|\Z)/g;
  let match;

  while ((match = sectionRegex.exec(`\n${text}\n`))) {
    const title = match[1].trim();
    const block = match[2].trim();
    if (!title.includes("vs")) continue;

    const [homeRaw, awayRaw] = title.split(/\s+vs\s+/i).map((item) => item.trim());
    const dateMatch = block.match(/([A-Z][a-z]+ \d{1,2}, 2026)/);
    const timeMatch = block.match(/(\d{1,2}:\d{2} (?:a|p)\.m\.) UTC([−-]\d+)/i);
    if (!dateMatch || !timeMatch) continue;

    const kickoff = parseKickoff(dateMatch[1], timeMatch[1], timeMatch[2]);
    if (!kickoff) continue;

    const venueMatch = block.match(/\[\s*Report\s+\d+\s*\]\s+([^,\n]+,\s*[^\n]+?)\s+Referee:/i);
    const refereeMatch = block.match(/Referee:\s+([A-Za-zÀ-ÖØ-öø-ÿ.' -]+)\s+\(([A-Za-zÀ-ÖØ-öø-ÿ.' -]+)\)/i);
    const venueText = venueMatch ? venueMatch[1].replace(/\s+,/g, ",").trim() : "待确认球场";
    const score = extractScore(block, homeRaw, awayRaw);
    const status = inferStatus(kickoff, score);
    const meta = venueMeta(venueText);

    const homeLineupBlockMatch = block.match(new RegExp(`${homeRaw}[\\s\\S]*?Manager:[\\s\\S]*?(?=${awayRaw}|Assistant referees|Fourth official|Reserve assistant referee|$)`));
    const awayLineupBlockMatch = block.match(new RegExp(`${awayRaw}[\\s\\S]*?Manager:[\\s\\S]*?(?=Assistant referees|Fourth official|Reserve assistant referee|$)`));

    matches.push({
      id: `${slugify(homeRaw)}-${slugify(awayRaw)}-${kickoff.toISOString().slice(0, 10)}`,
      phase: competition,
      homeRaw,
      awayRaw,
      homeTeam: teamZh(homeRaw),
      awayTeam: teamZh(awayRaw),
      kickoff,
      kickoffLocal: formatHuman(kickoff, meta?.timezone || "Asia/Shanghai", meta?.cityZh || ""),
      kickoffBeijing: `${formatHuman(kickoff, "Asia/Shanghai")} 北京时间`,
      venue: meta ? `${meta.zh}${venueText.includes(meta.zh) ? "" : ` / ${venueText}`}` : venueText,
      referee: refereeMatch ? `${refereeMatch[1]}（${teamZh(refereeMatch[2])}）` : "裁判待确认",
      status,
      score,
      lineupItems: [
        parseLineupBlock(homeLineupBlockMatch?.[0] || "", homeRaw),
        parseLineupBlock(awayLineupBlockMatch?.[0] || "", awayRaw)
      ].filter(Boolean)
    });
  }

  return matches;
}

function parseKnockoutMatches(text) {
  const phaseNames = [
    "Round of 32",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "Third place play-off",
    "Final"
  ];
  const phaseMap = {
    "Round of 32": "三十二强",
    "Round of 16": "十六强",
    "Quarter-finals": "四分之一决赛",
    "Semi-finals": "半决赛",
    "Third place play-off": "三四名决赛",
    Final: "决赛"
  };

  const matches = [];
  for (const phaseName of phaseNames) {
    const sectionPattern = new RegExp(`\\n###\\s+${phaseName}\\n([\\s\\S]*?)(?=\\n###\\s+|\\n##\\s+|\\Z)`);
    const sectionMatch = (`\n${text}\n`).match(sectionPattern);
    if (!sectionMatch) continue;
    const section = sectionMatch[1];

    const blockPattern = /([A-Z][a-z]+ \d{1,2}, 2026)\s+(\d{1,2}:\d{2} (?:a|p)\.m\.) UTC([−-]\d+)\s+([\s\S]*?)\s+\[\s*Report\s+\d+\s*\]\s+([^,\n]+,\s*[^\n]+?)\s+Referee:/gi;
    let blockMatch;
    while ((blockMatch = blockPattern.exec(section))) {
      const beforeVenue = blockMatch[4].replace(/\s+/g, " ").trim();
      const matchNumberResult = beforeVenue.match(/(.+?)\s+(?:(\d+)\s*[–-]\s*(\d+)|Match\s+(\d+))\s+(.+)/);
      if (!matchNumberResult) continue;

      const homeRaw = matchNumberResult[1].trim();
      const awayRaw = matchNumberResult[5].trim();
      const score = matchNumberResult[2] ? { home: Number(matchNumberResult[2]), away: Number(matchNumberResult[3]) } : null;
      const kickoff = parseKickoff(blockMatch[1], blockMatch[2], blockMatch[3]);
      if (!kickoff) continue;
      const venueText = blockMatch[5].replace(/\s+,/g, ",").trim();
      const meta = venueMeta(venueText);
      const status = inferStatus(kickoff, score);

      matches.push({
        id: `${slugify(homeRaw)}-${slugify(awayRaw)}-${kickoff.toISOString().slice(0, 10)}`,
        phase: `世界杯${phaseMap[phaseName]}`,
        homeRaw,
        awayRaw,
        homeTeam: teamZh(homeRaw),
        awayTeam: teamZh(awayRaw),
        kickoff,
        kickoffLocal: formatHuman(kickoff, meta?.timezone || "Asia/Shanghai", meta?.cityZh || ""),
        kickoffBeijing: `${formatHuman(kickoff, "Asia/Shanghai")} 北京时间`,
        venue: meta ? `${meta.zh}${venueText.includes(meta.zh) ? "" : ` / ${venueText}`}` : venueText,
        referee: "裁判待确认",
        status,
        score,
        lineupItems: []
      });
    }
  }
  return matches;
}

async function fetchWeather(meta, kickoff) {
  if (!meta?.lat || !meta?.lon) return null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${meta.lat}&longitude=${meta.lon}&timezone=${encodeURIComponent(meta.timezone)}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,windspeed_10m&forecast_days=3`;
    const payload = await fetchJson(url);
    const localHour = new Intl.DateTimeFormat("en-CA", {
      timeZone: meta.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false
    })
      .format(kickoff)
      .replace(",", "");
    const hourKey = `${localHour.replace(" ", "T")}:00`;
    const idx = (payload.hourly?.time || []).indexOf(hourKey);
    if (idx === -1) return null;
    return {
      temperature: payload.hourly.temperature_2m?.[idx],
      humidity: payload.hourly.relative_humidity_2m?.[idx],
      windSpeed: payload.hourly.windspeed_10m?.[idx],
      precipitationProbability: payload.hourly.precipitation_probability?.[idx],
      sourceUrl: "https://open-meteo.com/"
    };
  } catch {
    return null;
  }
}

function parseGoogleNewsRss(xmlText) {
  const items = [];
  const blocks = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks) {
    const get = (tag) => {
      const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return match ? decodeHtml(match[1].trim()) : "";
    };
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    items.push({
      title: get("title").replace(/\s*-\s*[^-]+$/, ""),
      link: get("link"),
      pubDate: get("pubDate"),
      source: sourceMatch ? decodeHtml(sourceMatch[1].trim()) : "Google News"
    });
  }
  return items.filter((item) => item.title && item.link).slice(0, 4);
}

async function fetchNews(homeTeam, awayTeam) {
  const query = encodeURIComponent(`${homeTeam} ${awayTeam} 世界杯 伤停 主帅 阵容`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  try {
    return parseGoogleNewsRss(await fetchText(url));
  } catch {
    return [];
  }
}

function normalizeProbabilities(home, draw, away) {
  const total = home + draw + away;
  return {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.max(0, 100 - Math.round((home / total) * 100) - Math.round((draw / total) * 100))
  };
}

function parseHandicapProbability(asianHandicap = "") {
  const text = String(asianHandicap);
  const match = text.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const line = Number(match[1]);
  if (Number.isNaN(line)) return null;
  const strength = Math.min(1.5, Math.abs(line)) / 1.5;
  const homeFav = text.includes("主") || text.includes("-");
  return homeFav
    ? normalizeProbabilities(42 + strength * 26, 30 - strength * 8, 28 - strength * 18)
    : normalizeProbabilities(28 - strength * 18, 30 - strength * 8, 42 + strength * 26);
}

function deriveProbabilities(report, market) {
  const marketProb = parseHandicapProbability(market?.asianHandicap);
  if (marketProb) return marketProb;
  if (report.status.code === "finished" && report.score) {
    if (report.score.home > report.score.away) return { home: 100, draw: 0, away: 0 };
    if (report.score.home < report.score.away) return { home: 0, draw: 0, away: 100 };
    return { home: 0, draw: 100, away: 0 };
  }
  return { home: 38, draw: 30, away: 32 };
}

function deriveRecommendation(report, probabilities) {
  if (report.status.code === "finished") {
    return "已完赛，以下保留赛前判断与结果回看。";
  }
  if (report.status.code === "live") {
    return "比赛进行中，建议以现场比分和红黄牌情况为主。";
  }
  if (probabilities.home > probabilities.away && probabilities.home >= probabilities.draw) {
    return `${report.homeTeam}方向，优先防平`;
  }
  if (probabilities.away > probabilities.home && probabilities.away >= probabilities.draw) {
    return `${report.awayTeam}方向，优先防平`;
  }
  return "平局热度需谨慎，临场看阵容和盘口再定";
}

function derivePrediction(report, market) {
  if (report.status.code === "finished" && report.score) {
    return `${report.score.home}-${report.score.away}（已完赛）`;
  }
  if (report.status.code === "live" && report.score) {
    return `${report.score.home}-${report.score.away}（进行中）`;
  }
  const ou = Number(String(market?.overUnder || "").match(/\d+(?:\.\d+)?/)?.[0] || "2.25");
  const homeFav = report.probabilities.home >= report.probabilities.away;
  if (ou <= 2.25) return homeFav ? "1-0 / 1-1 / 2-0" : "0-1 / 1-1 / 0-2";
  if (ou <= 2.75) return homeFav ? "2-1 / 1-1 / 2-0" : "1-2 / 1-1 / 0-1";
  return homeFav ? "2-1 / 3-1 / 2-2" : "1-2 / 1-3 / 2-2";
}

function buildCurrentScore(status, score) {
  if (!score) {
    return status.code === "live" ? "比赛进行中，比分源待补抓" : "暂无比分";
  }
  return `${score.home} - ${score.away}`;
}

function buildSnapshot(report, market, weather) {
  const lines = [
    `比赛状态：${report.status.label}。当前比分：${report.currentScore}。`,
    `开球时间：${report.kickoffBeijing}；比赛地点：${report.venue}。`
  ];
  if (weather) {
    lines.push(`天气快照：气温约 ${weather.temperature}°C，湿度 ${weather.humidity}% ，风速 ${weather.windSpeed} km/h，降雨概率 ${weather.precipitationProbability}% 。`);
  }
  if (market?.asianHandicap || market?.overUnder) {
    lines.push(`盘口快照：${market.asianHandicap || "让球暂缺"}；大小球 ${market.overUnder || "暂缺"}。`);
  } else {
    lines.push("盘口快照：当前未接入可验证的即时盘口源，需临场补抓亚洲盘、大小球和 1X2。");
  }
  return lines;
}

function buildNews(report, newsItems) {
  if (report.status.code === "finished") {
    return ["比赛已结束，新闻区主要保留赛前与现场背景信息。"];
  }
  if (!newsItems.length) {
    return ["未抓到足够可靠的中文新闻源，需临场补核伤停、主帅表态、旅途与场地消息。"];
  }
  return newsItems.map((item) => {
    const dt = item.pubDate ? new Date(item.pubDate).toLocaleString("zh-CN", { hour12: false }) : "时间未标注";
    return `${item.source}：${item.title}（${dt}）`;
  });
}

function buildMarketRead(report, market) {
  if (report.status.code === "finished") {
    return "比赛已完赛，盘口解读保留作回看，不再作为临场下注依据。";
  }
  if (!market?.asianHandicap && !market?.overUnder) {
    return "截至更新时间，未能验证可用的即时盘口源。当前只能依据赛程、比分状态和公开新闻做基本面判断。";
  }
  return `${market.asianHandicap ? `亚洲让球参考：${market.asianHandicap}。` : ""}${market.overUnder ? `大小球参考：${market.overUnder}。` : ""}临场仍需结合首发完整度、盘口是否联动和热门是否过热来判断真实价值。`;
}

function buildMarketMovement(report, market) {
  if (report.status.code === "finished") {
    return "比赛已结束，盘口热度信息仅供赛后复盘。";
  }
  if (market?.movement) return market.movement;
  return "当前未接入完整的初盘到即时盘变动链路。若后续接入盘口源，应重点监控只降水不升盘、升盘配高水和大小球不联动等过热信号。";
}

function buildLineup(report, lineupOverride) {
  if (Array.isArray(lineupOverride?.items) && lineupOverride.items.length) return lineupOverride.items;
  if (report.lineupItems?.length) return report.lineupItems;
  return [
    `${report.homeTeam}：官方首发如未公布，需临场优先核对门将、中卫、后腰与中锋。`,
    `${report.awayTeam}：重点核查门将、主力中卫与反击速度点是否齐整。`
  ];
}

function buildFormData(report, formOverride) {
  if (Array.isArray(formOverride?.items) && formOverride.items.length) return formOverride.items;
  return [
    `${report.homeTeam}：若无稳定近况源，建议至少补抓近 5 到 10 场战绩、预期进球、预期失球与定位球效率。`,
    `${report.awayTeam}：建议补抓零封质量、先失球后的追分能力，以及面对高压逼抢时的出球稳定性。`
  ];
}

function buildFactors(report, weather) {
  const items = [
    `阶段因素：${report.competition}，不同阶段对比赛节奏和保守程度影响很大。`,
    `裁判因素：${report.referee || "裁判待确认"}。若后续接入裁判尺度源，应重点看黄牌和点球倾向。`
  ];
  if (weather) {
    items.push(`天气因素：气温约 ${weather.temperature}°C，湿度 ${weather.humidity}% ，风速 ${weather.windSpeed} km/h，降雨概率 ${weather.precipitationProbability}% 。`);
  } else {
    items.push("天气因素：实时天气源暂缺，临场需复核气温、湿度、风速与降雨。");
  }
  items.push(`场地因素：${report.venue} 所在城市的旅途恢复、球迷氛围和草皮条件都会影响比赛走势。`);
  return items;
}

function buildModelNote(report, market) {
  if (report.status.code === "finished") {
    return "已完赛，模型部分主要用于赛后复盘：比对赛前倾向与实际比分、盘口和临场阵容是否一致。";
  }
  if (report.status.code === "live") {
    return "比赛进行中，模型静态判断会快速失效，现场比分、红黄牌和换人信息权重更高。";
  }
  if (!market?.asianHandicap) {
    return "当前模型优先依赖赛程、阵容、天气与新闻基本面；由于即时盘口缺失，建议先看方向，不宜直接落深盘。";
  }
  return "当前模型综合首发确认、预期进球质量、定位球、裁判尺度和旅途恢复。如果让球与大小球联动合理，且临场首发完整，基本面与盘口方向更容易一致。";
}

function buildRisk(report, market) {
  if (report.status.code === "live") {
    return "比赛进行中，最大风险来自现场红黄牌、伤病和临场换人对比分的即时冲击。";
  }
  if (!market?.asianHandicap) {
    return "盘口缺失时，主要风险在于价格判断不足，建议临场补抓可验证盘口后再落地。";
  }
  return "最大风险在于热门过热、升盘配高水或首发中轴临场变化，导致赛果方向和让球方向脱节。";
}

function buildSources(report, newsItems, weather, market) {
  const items = [
    { label: "维基百科世界杯主页面", url: WIKI_MAIN_URL },
    report.sourceUrl ? { label: "维基百科小组/阶段页面", url: report.sourceUrl } : null,
    weather ? { label: "开放天气源", url: weather.sourceUrl } : null,
    market?.sourceUrl ? { label: market.sourceLabel || "盘口源", url: market.sourceUrl } : null,
    ...newsItems.map((item) => ({ label: `${item.source} 新闻`, url: item.link }))
  ].filter(Boolean);
  return uniqueBy(items, (item) => item.url);
}

function pickOverride(sourceObject, report) {
  const keys = [
    report.id,
    `${report.homeRaw}__${report.awayRaw}`,
    `${report.homeTeam}__${report.awayTeam}`
  ];
  for (const key of keys) {
    if (sourceObject[key]) return sourceObject[key];
  }
  return null;
}

async function buildAllMatches() {
  const [mainHtml, groupHtmlResults] = await Promise.all([
    fetchText(WIKI_MAIN_URL),
    Promise.all(GROUP_URLS.map(async (item) => ({ ...item, html: await fetchText(item.url) })))
  ]);

  const groupMatches = groupHtmlResults.flatMap((item) => {
    const text = htmlToStructuredText(item.html);
    return parseGroupMatches(item.letter, text).map((match) => ({
      ...match,
      sourceUrl: item.url
    }));
  });

  const mainText = htmlToStructuredText(mainHtml);
  const knockoutMatches = parseKnockoutMatches(mainText).map((match) => ({
    ...match,
    sourceUrl: WIKI_MAIN_URL
  }));

  return uniqueBy([...groupMatches, ...knockoutMatches], (item) => item.id).sort((a, b) => a.kickoff - b.kickoff);
}

async function buildReports() {
  const [marketOverrides, formOverrides, lineupOverrides] = await Promise.all([
    readOptionalJson(MARKETS_FILE),
    readOptionalJson(FORM_FILE),
    readOptionalJson(LINEUP_FILE)
  ]);

  const rawMatches = await buildAllMatches();
  if (!rawMatches.length) {
    throw new Error("未能从新的赛程源解析到任何世界杯比赛。");
  }

  const now = nowBeijing();
  const reports = [];
  for (const raw of rawMatches) {
    const meta = venueMeta(raw.venue);
    const withinEnrichWindow =
      raw.kickoff.getTime() >= now.getTime() - 3 * 60 * 60 * 1000 &&
      raw.kickoff.getTime() <= now.getTime() + UPCOMING_HOURS_FOR_ENRICH * 60 * 60 * 1000;

    const marketOverride = pickOverride(marketOverrides, raw);
    const formOverride = pickOverride(formOverrides, raw);
    const lineupOverride = pickOverride(lineupOverrides, raw);

    const market = marketOverride
      ? {
          asianHandicap: marketOverride.asianHandicap || "",
          overUnder: marketOverride.overUnder || "",
          movement: marketOverride.movement || "",
          sourceUrl: marketOverride.sourceUrl || "",
          sourceLabel: marketOverride.sourceLabel || "自定义盘口源"
        }
      : null;

    const [weather, newsItems] = withinEnrichWindow
      ? await Promise.all([fetchWeather(meta, raw.kickoff), fetchNews(raw.homeTeam, raw.awayTeam)])
      : [null, []];

    const report = {
      ...raw,
      currentScore: buildCurrentScore(raw.status, raw.score)
    };
    report.probabilities = deriveProbabilities(report, market);

    reports.push({
      id: report.id,
      competition: report.phase,
      homeTeam: report.homeTeam,
      awayTeam: report.awayTeam,
      kickoffLocal: report.kickoffLocal,
      kickoffBeijing: report.kickoffBeijing,
      venue: report.venue,
      status: report.status.code,
      statusLabel: report.status.label,
      currentScore: report.currentScore,
      score: report.score || null,
      recommendation: deriveRecommendation(report, report.probabilities),
      probabilities: report.probabilities,
      scorePrediction: derivePrediction(report, market),
      snapshot: buildSnapshot(report, market, weather),
      news: buildNews(report, newsItems),
      marketRead: buildMarketRead(report, market),
      marketMovement: buildMarketMovement(report, market),
      lineup: buildLineup(report, lineupOverride),
      formData: buildFormData(report, formOverride),
      factors: buildFactors(report, weather),
      modelNote: buildModelNote(report, market),
      risk: buildRisk(report, market),
      sources: buildSources(report, newsItems, weather, market)
    });
  }

  return reports;
}

async function main() {
  const reports = await buildReports();
  const payload = {
    updatedAt: formatIsoWithOffset(new Date()),
    timezone: "Asia/Shanghai",
    reports
  };

  await fs.mkdir(path.dirname(reportsPath), { recursive: true });
  await fs.writeFile(reportsPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`写入 ${reports.length} 场世界杯比赛到 data/reports.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
