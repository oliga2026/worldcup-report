import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = __dirname;
const reportsPath = path.join(repoRoot, "data", "reports.json");

const LOOKAHEAD_HOURS = Number(process.env.WORLDCUP_LOOKAHEAD_HOURS || "36");
const ESPN_SCOREBOARD_URL =
  process.env.WORLDCUP_SCOREBOARD_URL ||
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const MARKETS_FILE = process.env.WORLDCUP_MARKETS_FILE || path.join(repoRoot, "data", "markets.override.json");
const FORM_FILE = process.env.WORLDCUP_FORM_FILE || path.join(repoRoot, "data", "form.override.json");
const LINEUP_FILE = process.env.WORLDCUP_LINEUP_FILE || path.join(repoRoot, "data", "lineups.override.json");

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
  "Estadio Azteca": {
    zh: "阿兹特克球场",
    cityZh: "墨西哥城",
    timezone: "America/Mexico_City",
    lat: 19.3029,
    lon: -99.1505
  },
  "Mexico City Stadium": {
    zh: "墨西哥城体育场",
    cityZh: "墨西哥城",
    timezone: "America/Mexico_City",
    lat: 19.3029,
    lon: -99.1505
  },
  "BMO Field": {
    zh: "BMO 球场",
    cityZh: "多伦多",
    timezone: "America/Toronto",
    lat: 43.6332,
    lon: -79.4186
  },
  "Toronto Stadium": {
    zh: "多伦多体育场",
    cityZh: "多伦多",
    timezone: "America/Toronto",
    lat: 43.6332,
    lon: -79.4186
  },
  "BC Place": {
    zh: "卑诗体育馆",
    cityZh: "温哥华",
    timezone: "America/Vancouver",
    lat: 49.2768,
    lon: -123.1118
  },
  "Vancouver Stadium": {
    zh: "温哥华体育场",
    cityZh: "温哥华",
    timezone: "America/Vancouver",
    lat: 49.2768,
    lon: -123.1118
  },
  "SoFi Stadium": {
    zh: "SoFi 球场",
    cityZh: "洛杉矶",
    timezone: "America/Los_Angeles",
    lat: 33.9535,
    lon: -118.3392
  },
  "Los Angeles Stadium": {
    zh: "洛杉矶体育场",
    cityZh: "洛杉矶",
    timezone: "America/Los_Angeles",
    lat: 33.9535,
    lon: -118.3392
  },
  "MetLife Stadium": {
    zh: "大都会人寿球场",
    cityZh: "纽约/新泽西",
    timezone: "America/New_York",
    lat: 40.8135,
    lon: -74.0745
  },
  "New York New Jersey Stadium": {
    zh: "纽约新泽西体育场",
    cityZh: "纽约/新泽西",
    timezone: "America/New_York",
    lat: 40.8135,
    lon: -74.0745
  },
  "Mercedes-Benz Stadium": {
    zh: "梅赛德斯-奔驰球场",
    cityZh: "亚特兰大",
    timezone: "America/New_York",
    lat: 33.7554,
    lon: -84.4008
  },
  "Atlanta Stadium": {
    zh: "亚特兰大体育场",
    cityZh: "亚特兰大",
    timezone: "America/New_York",
    lat: 33.7554,
    lon: -84.4008
  },
  "AT&T Stadium": {
    zh: "AT&T 球场",
    cityZh: "达拉斯",
    timezone: "America/Chicago",
    lat: 32.7473,
    lon: -97.0945
  },
  "Dallas Stadium": {
    zh: "达拉斯体育场",
    cityZh: "达拉斯",
    timezone: "America/Chicago",
    lat: 32.7473,
    lon: -97.0945
  },
  "NRG Stadium": {
    zh: "NRG 球场",
    cityZh: "休斯敦",
    timezone: "America/Chicago",
    lat: 29.6847,
    lon: -95.4107
  },
  "Houston Stadium": {
    zh: "休斯敦体育场",
    cityZh: "休斯敦",
    timezone: "America/Chicago",
    lat: 29.6847,
    lon: -95.4107
  },
  "Arrowhead Stadium": {
    zh: "箭头球场",
    cityZh: "堪萨斯城",
    timezone: "America/Chicago",
    lat: 39.0489,
    lon: -94.4839
  },
  "Kansas City Stadium": {
    zh: "堪萨斯城体育场",
    cityZh: "堪萨斯城",
    timezone: "America/Chicago",
    lat: 39.0489,
    lon: -94.4839
  },
  "Hard Rock Stadium": {
    zh: "硬石球场",
    cityZh: "迈阿密",
    timezone: "America/New_York",
    lat: 25.958,
    lon: -80.2389
  },
  "Miami Stadium": {
    zh: "迈阿密体育场",
    cityZh: "迈阿密",
    timezone: "America/New_York",
    lat: 25.958,
    lon: -80.2389
  },
  "Gillette Stadium": {
    zh: "吉列球场",
    cityZh: "波士顿",
    timezone: "America/New_York",
    lat: 42.0909,
    lon: -71.2643
  },
  "Boston Stadium": {
    zh: "波士顿体育场",
    cityZh: "波士顿",
    timezone: "America/New_York",
    lat: 42.0909,
    lon: -71.2643
  },
  "Lincoln Financial Field": {
    zh: "林肯金融球场",
    cityZh: "费城",
    timezone: "America/New_York",
    lat: 39.9008,
    lon: -75.1675
  },
  "Philadelphia Stadium": {
    zh: "费城体育场",
    cityZh: "费城",
    timezone: "America/New_York",
    lat: 39.9008,
    lon: -75.1675
  },
  "Levi's Stadium": {
    zh: "李维斯球场",
    cityZh: "旧金山湾区",
    timezone: "America/Los_Angeles",
    lat: 37.403,
    lon: -121.97
  },
  "San Francisco Bay Area Stadium": {
    zh: "旧金山湾区体育场",
    cityZh: "旧金山湾区",
    timezone: "America/Los_Angeles",
    lat: 37.403,
    lon: -121.97
  },
  "Lumen Field": {
    zh: "流明球场",
    cityZh: "西雅图",
    timezone: "America/Los_Angeles",
    lat: 47.5952,
    lon: -122.3316
  },
  "Seattle Stadium": {
    zh: "西雅图体育场",
    cityZh: "西雅图",
    timezone: "America/Los_Angeles",
    lat: 47.5952,
    lon: -122.3316
  },
  "Estadio BBVA": {
    zh: "BBVA 球场",
    cityZh: "蒙特雷",
    timezone: "America/Monterrey",
    lat: 25.6692,
    lon: -100.2446
  },
  "Monterrey Stadium": {
    zh: "蒙特雷体育场",
    cityZh: "蒙特雷",
    timezone: "America/Monterrey",
    lat: 25.6692,
    lon: -100.2446
  },
  "Estadio Akron": {
    zh: "阿克伦球场",
    cityZh: "瓜达拉哈拉",
    timezone: "America/Mexico_City",
    lat: 20.6829,
    lon: -103.4622
  },
  "Guadalajara Stadium": {
    zh: "瓜达拉哈拉体育场",
    cityZh: "瓜达拉哈拉",
    timezone: "America/Mexico_City",
    lat: 20.6829,
    lon: -103.4622
  }
};

function nowInBeijing() {
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

function formatHuman(date, timeZone, citySuffix = "") {
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
    .replace(/\//g, "-");
  return citySuffix ? `${formatted} ${citySuffix}` : formatted;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function teamZh(name) {
  return TEAM_NAME_MAP[name] || name;
}

function venueMeta(rawVenueName = "", rawCity = "") {
  const candidateKeys = [rawVenueName, rawCity];
  for (const candidate of candidateKeys) {
    for (const [key, value] of Object.entries(VENUE_MAP)) {
      if (candidate && candidate.includes(key)) {
        return value;
      }
    }
  }
  return null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readOptionalJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "worldcup-report-bot/1.0",
      accept: "application/json,text/plain,*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "worldcup-report-bot/1.0",
      accept: "text/xml,text/html,text/plain,*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function fetchScoreboardForDate(dateString) {
  const url = `${ESPN_SCOREBOARD_URL}?dates=${dateString}&limit=200&lang=zh`;
  try {
    const payload = await fetchJson(url);
    return { ok: true, events: safeArray(payload.events) };
  } catch {
    return { ok: false, events: [] };
  }
}

function formatDateKey(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .format(date)
    .replaceAll("-", "");
}

async function loadUpcomingMatches() {
  const now = nowInBeijing();
  const end = new Date(now.getTime() + LOOKAHEAD_HOURS * 60 * 60 * 1000);
  const dateKeys = uniqueBy(
    [now, new Date(now.getTime() + 24 * 60 * 60 * 1000), end],
    (date) => formatDateKey(date)
  ).map((date) => formatDateKey(date));

  const events = [];
  let successCount = 0;
  for (const dateKey of dateKeys) {
    const result = await fetchScoreboardForDate(dateKey);
    if (result.ok) successCount += 1;
    events.push(...result.events);
  }

  if (successCount === 0) {
    throw new Error("未能从赛程源抓到任何比赛数据，请检查网络或 WORLDCUP_SCOREBOARD_URL。");
  }

  return uniqueBy(events, (event) => event.id).filter((event) => {
    const kickoff = new Date(event.date);
    return kickoff >= now && kickoff <= end;
  });
}

async function fetchWeather(meta, kickoff) {
  if (!meta?.lat || !meta?.lon) {
    return null;
  }

  const dateKey = new Intl.DateTimeFormat("sv-SE", {
    timeZone: meta.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(kickoff);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${meta.lat}&longitude=${meta.lon}&timezone=${encodeURIComponent(meta.timezone)}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,windspeed_10m&daily=weather_code&forecast_days=2`;
  try {
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
    const hourKey = localHour.replace(" ", "T") + ":00";
    const index = safeArray(payload.hourly?.time).indexOf(hourKey);
    if (index === -1) {
      return null;
    }
    return {
      dateKey,
      temperature: payload.hourly.temperature_2m?.[index],
      humidity: payload.hourly.relative_humidity_2m?.[index],
      windSpeed: payload.hourly.windspeed_10m?.[index],
      precipitationProbability: payload.hourly.precipitation_probability?.[index],
      sourceUrl: "https://open-meteo.com/"
    };
  } catch {
    return null;
  }
}

function rssDecode(value) {
  return String(value || "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function parseGoogleNewsRss(xmlText) {
  const items = [];
  const blocks = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of blocks) {
    const get = (tag) => {
      const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return match ? rssDecode(match[1].trim()) : "";
    };
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    items.push({
      title: get("title").replace(/\s*-\s*[^-]+$/, ""),
      link: get("link"),
      pubDate: get("pubDate"),
      source: sourceMatch ? rssDecode(sourceMatch[1].trim()) : "Google News"
    });
  }
  return items.filter((item) => item.title && item.link);
}

async function fetchNews(home, away) {
  const query = encodeURIComponent(`${home} ${away} 世界杯 伤停 主帅 天气 阵容`);
  const url = `https://news.google.com/rss/search?q=${query}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
  try {
    const xml = await fetchText(url);
    return parseGoogleNewsRss(xml).slice(0, 4);
  } catch {
    return [];
  }
}

function normalizeProbabilitySet(home, draw, away) {
  const total = home + draw + away;
  if (!total) return { home: 34, draw: 32, away: 34 };
  return {
    home: Math.round((home / total) * 100),
    draw: Math.round((draw / total) * 100),
    away: Math.max(0, 100 - Math.round((home / total) * 100) - Math.round((draw / total) * 100))
  };
}

function handicapToProbabilities(handicap = "") {
  const text = String(handicap);
  const match = text.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const line = Number(match[1]);
  if (Number.isNaN(line)) return null;
  const favoriteStrength = Math.max(-1.5, Math.min(1.5, Math.abs(line))) / 1.5;
  const homeFavored = text.includes("-") || /主/.test(text);
  if (homeFavored) {
    return normalizeProbabilitySet(42 + favoriteStrength * 28, 30 - favoriteStrength * 10, 28 - favoriteStrength * 18);
  }
  return normalizeProbabilitySet(28 - favoriteStrength * 18, 30 - favoriteStrength * 10, 42 + favoriteStrength * 28);
}

function parseOddsBlock(event, marketOverride) {
  if (marketOverride) return marketOverride;
  const rawOdds = safeArray(event.competitions?.[0]?.odds);
  if (!rawOdds.length) return null;
  const first = rawOdds[0];
  return {
    asianHandicap: first.details || first.displayValue || "",
    overUnder: first.overUnder ? String(first.overUnder) : "",
    provider: first.provider?.name || "ESPN"
  };
}

function deriveProbabilities(event, market) {
  const fromHandicap = handicapToProbabilities(market?.asianHandicap);
  if (fromHandicap) return fromHandicap;

  const home = event.competitions?.[0]?.competitors?.find((item) => item.homeAway === "home");
  const away = event.competitions?.[0]?.competitors?.find((item) => item.homeAway === "away");
  const homeRank = Number(home?.curatedRank?.current || home?.rank || 0);
  const awayRank = Number(away?.curatedRank?.current || away?.rank || 0);

  if (homeRank && awayRank) {
    const homeScore = 100 - homeRank;
    const awayScore = 100 - awayRank;
    return normalizeProbabilitySet(homeScore, 24, awayScore);
  }

  return { home: 38, draw: 29, away: 33 };
}

function deriveRecommendation(homeTeam, awayTeam, probabilities) {
  if (probabilities.home > probabilities.away && probabilities.home >= probabilities.draw) {
    return `${homeTeam}方向，优先防平`;
  }
  if (probabilities.away > probabilities.home && probabilities.away >= probabilities.draw) {
    return `${awayTeam}方向，优先防平`;
  }
  return "平局热度需谨慎，临场看阵容与盘口再定";
}

function deriveScorePrediction(probabilities, market) {
  const overUnder = Number(String(market?.overUnder || "").match(/\d+(?:\.\d+)?/)?.[0] || "2.25");
  const homeFav = probabilities.home >= probabilities.away;
  if (overUnder <= 2.25) {
    return homeFav ? "1-0 / 1-1 / 2-0" : "0-1 / 1-1 / 0-2";
  }
  if (overUnder <= 2.75) {
    return homeFav ? "2-1 / 1-1 / 2-0" : "1-2 / 1-1 / 0-1";
  }
  return homeFav ? "2-1 / 3-1 / 2-2" : "1-2 / 1-3 / 2-2";
}

function buildMarketRead(homeTeam, awayTeam, market, probabilities) {
  if (!market?.asianHandicap && !market?.overUnder) {
    return `截至更新时间，未能验证可用的即时盘口源。当前只能依据可验证赛程和公开新闻做基本面判断，建议临场补抓亚洲让球、大小球与 1X2 后再落盘。`;
  }

  const favored = probabilities.home >= probabilities.away ? homeTeam : awayTeam;
  return [
    market.asianHandicap ? `亚洲让球参考：${market.asianHandicap}。` : "亚洲让球参考暂缺。",
    market.overUnder ? `大小球参考：${market.overUnder}。` : "大小球参考暂缺。",
    `当前盘口阅读偏向 ${favored} 一侧，但仍需结合临场首发与水位确认是否属于真实强势而非热度堆积。`
  ].join("");
}

function buildMarketMovement(market) {
  if (market?.movement) {
    return market.movement;
  }
  if (!market?.asianHandicap && !market?.overUnder) {
    return "未接入稳定的盘口变动源，暂无法验证初盘、即时盘和水位升降。建议至少补抓一组亚洲盘与大小球快照。";
  }
  return "当前已记录盘口快照，但尚未拿到完整初盘到即时盘链路。若后续接入盘口源，应重点监控是否出现只降水不升盘、升盘配高水或大小球不联动等过热迹象。";
}

function buildWeatherLine(weather) {
  if (!weather) {
    return "天气与草皮信息暂未抓到可验证实时源，需临场复核温度、湿度、风速与降雨。";
  }
  return `天气快照：气温约 ${weather.temperature}°C，湿度 ${weather.humidity}% ，风速 ${weather.windSpeed} km/h，降雨概率 ${weather.precipitationProbability}% 。`;
}

function buildSnapshot(match, market, weather) {
  const lines = [];
  lines.push(`开球窗口：北京时间 ${match.kickoffBeijing}，比赛地点 ${match.venue}。`);
  lines.push(buildWeatherLine(weather));
  if (market?.asianHandicap || market?.overUnder) {
    lines.push(`盘口快照：${market.asianHandicap || "让球暂缺"}；大小球 ${market.overUnder || "暂缺"}。`);
  } else {
    lines.push("盘口快照：当前未接入稳定盘口源，临场需优先补抓亚洲让球、大小球与 1X2。");
  }
  lines.push("临场首发仍是最高优先级变量，门将、双中卫、后腰和中锋的变化会直接影响胜率和比分上限。");
  return lines;
}

function buildNews(newsItems) {
  if (!newsItems.length) {
    return ["截至更新时间，未抓到足够可靠的中文新闻源，需临场补核伤停、主帅表态、旅途与场地消息。"];
  }
  return newsItems.map((item) => {
    const dateText = item.pubDate ? new Date(item.pubDate).toLocaleString("zh-CN", { hour12: false }) : "时间未标注";
    return `${item.source}：${item.title}（${dateText}）`;
  });
}

function buildLineup(homeTeam, awayTeam, lineupOverride) {
  if (safeArray(lineupOverride?.items).length) {
    return lineupOverride.items;
  }
  return [
    `${homeTeam}：截至更新时间，官方首发尚未公布，需在赛前 60 到 90 分钟确认门将、中卫、后腰和中锋。`,
    `${awayTeam}：重点核查门将、主力中卫与反击速度点是否齐整，任何临场缺席都可能显著改变让球判断。`
  ];
}

function buildFormData(homeTeam, awayTeam, formOverride) {
  if (safeArray(formOverride?.items).length) {
    return formOverride.items;
  }
  return [
    `${homeTeam}：当前自动化未接入稳定的近 5 到 10 场战绩源，后续建议补抓预期进球、预期失球、禁区射门和先入球后走势。`,
    `${awayTeam}：当前自动化未接入稳定的近况明细，临场应补抓零封质量、被高压逼抢下的出球稳定性以及定位球攻防数据。`
  ];
}

function buildFactors(match, weather) {
  const factors = [];
  if (weather) {
    factors.push(`天气因素：${buildWeatherLine(weather)}`);
  } else {
    factors.push("天气因素：实时天气源暂缺，建议临场复核气温、湿度、风速与降雨。");
  }
  factors.push("动机因素：需结合小组形势、净胜球需求和平局接受度综合判断，不宜只用笼统战意描述。");
  factors.push("裁判因素：若后续接入裁判指派，应跟踪黄牌尺度、点球倾向和身体对抗容忍度。");
  factors.push(`场地因素：${match.venue} 的城市环境、球迷氛围与旅途恢复情况，都会影响比赛节奏与下半场走势。`);
  return factors;
}

function buildModelNote(match, probabilities, market) {
  const favored = probabilities.home >= probabilities.away ? match.homeTeam : match.awayTeam;
  if (!market?.asianHandicap && !market?.overUnder) {
    return `当前模型只能基于赛程、场地、天气和公开新闻做中文基本面判断，尚未获得足够盘口输入。现阶段更适合把 ${favored} 视为倾向方向，而非直接落深盘。`;
  }
  return `当前模型把首发确认、预期进球质量、定位球、裁判尺度与旅途恢复作为核心变量。若 ${favored} 一侧临场首发完整，且让球与大小球联动合理，则基本面与盘口方向一致；若出现热门过热但大小球不跟随上调，应优先回避深盘。`;
}

function buildRisk(market) {
  if (!market?.asianHandicap && !market?.overUnder) {
    return "最大风险在于盘口信息缺失导致价格判断不足。未验证到即时盘前，不建议只凭基本面直接做让球结论。";
  }
  return "最大风险在于热门方向可能被市场过度追捧。若临场只降水不升盘、升盘配高水，或首发中轴出现缺口，赛果与让球的匹配度会明显下降。";
}

function buildSources(match, weather, newsItems, market) {
  const sources = [
    { label: "ESPN 赛程源", url: match.sourceUrl },
    weather ? { label: "开放天气源", url: weather.sourceUrl } : null,
    market?.sourceUrl ? { label: market.sourceLabel || "盘口源", url: market.sourceUrl } : null,
    ...newsItems.map((item) => ({ label: `${item.source} 新闻`, url: item.link }))
  ].filter(Boolean);

  return uniqueBy(sources, (item) => item.url);
}

function matchOverrideKey(event, homeName, awayName) {
  return [
    event.id,
    `${homeName}__${awayName}`,
    `${teamZh(homeName)}__${teamZh(awayName)}`
  ];
}

function pickOverride(sourceObject, event, homeName, awayName) {
  for (const key of matchOverrideKey(event, homeName, awayName)) {
    if (sourceObject[key]) return sourceObject[key];
  }
  return null;
}

async function buildReports() {
  const [marketOverrides, formOverrides, lineupOverrides] = await Promise.all([
    readOptionalJson(MARKETS_FILE),
    readOptionalJson(FORM_FILE),
    readOptionalJson(LINEUP_FILE)
  ]);

  const events = await loadUpcomingMatches();
  const reports = [];

  for (const event of events) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const home = competition.competitors?.find((item) => item.homeAway === "home") || competition.competitors?.[0];
    const away = competition.competitors?.find((item) => item.homeAway === "away") || competition.competitors?.[1];
    if (!home || !away) continue;

    const kickoff = new Date(event.date);
    const rawVenueName = competition.venue?.fullName || event.venue?.fullName || event.circuit?.fullName || "";
    const rawCity = competition.venue?.address?.city || competition.venue?.address?.summary || "";
    const meta = venueMeta(rawVenueName, rawCity);
    const venueLabel = meta ? `${meta.zh}${rawVenueName && !rawVenueName.includes(meta.zh) ? ` / ${rawVenueName}` : ""}` : rawVenueName || rawCity || "待确认球场";
    const kickoffLocal = formatHuman(kickoff, meta?.timezone || "Asia/Shanghai", meta?.cityZh || rawCity);
    const kickoffBeijing = `${formatHuman(kickoff, "Asia/Shanghai")} 北京时间`;

    const marketOverride = pickOverride(marketOverrides, event, home.team?.displayName || home.team?.shortDisplayName, away.team?.displayName || away.team?.shortDisplayName);
    const formOverride = pickOverride(formOverrides, event, home.team?.displayName || home.team?.shortDisplayName, away.team?.displayName || away.team?.shortDisplayName);
    const lineupOverride = pickOverride(lineupOverrides, event, home.team?.displayName || home.team?.shortDisplayName, away.team?.displayName || away.team?.shortDisplayName);

    const [weather, newsItems] = await Promise.all([
      fetchWeather(meta, kickoff),
      fetchNews(home.team?.displayName || "", away.team?.displayName || "")
    ]);

    const market = parseOddsBlock(event, marketOverride);
    if (marketOverride?.sourceUrl) {
      market.sourceUrl = marketOverride.sourceUrl;
      market.sourceLabel = marketOverride.sourceLabel || "自定义盘口源";
    }

    const probabilities = deriveProbabilities(event, market);
    const homeTeam = teamZh(home.team?.displayName || home.team?.shortDisplayName || "主队");
    const awayTeam = teamZh(away.team?.displayName || away.team?.shortDisplayName || "客队");
    const competitionName = event.league?.name || event.season?.type?.name || competition?.notes?.[0]?.headline || "世界杯";
    const competitionZh = String(competitionName).includes("World Cup") ? "世界杯" : competitionName;

    const report = {
      id: `${slugify(home.team?.displayName)}-${slugify(away.team?.displayName)}-${kickoff.toISOString().slice(0, 10)}`,
      competition: competitionZh,
      homeTeam,
      awayTeam,
      kickoffLocal,
      kickoffBeijing,
      venue: venueLabel,
      recommendation: deriveRecommendation(homeTeam, awayTeam, probabilities),
      probabilities,
      scorePrediction: deriveScorePrediction(probabilities, market),
      snapshot: buildSnapshot(
        {
          kickoffBeijing,
          venue: venueLabel
        },
        market,
        weather
      ),
      news: buildNews(newsItems),
      marketRead: buildMarketRead(homeTeam, awayTeam, market, probabilities),
      marketMovement: buildMarketMovement(market),
      lineup: buildLineup(homeTeam, awayTeam, lineupOverride),
      formData: buildFormData(homeTeam, awayTeam, formOverride),
      factors: buildFactors({ venue: venueLabel }, weather),
      modelNote: buildModelNote({ homeTeam, awayTeam }, probabilities, market),
      risk: buildRisk(market),
      sources: buildSources({ sourceUrl: `${ESPN_SCOREBOARD_URL}?event=${event.id}` }, weather, newsItems, market)
    };

    reports.push(report);
  }

  return reports.sort((a, b) => a.kickoffBeijing.localeCompare(b.kickoffBeijing));
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

  console.log(`写入 ${reports.length} 场比赛到 data/reports.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
