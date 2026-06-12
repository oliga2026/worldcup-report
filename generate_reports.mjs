import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const PROBE_DIR = path.join(DATA_DIR, "fifa_probe");
const REPORTS_PATH = path.join(DATA_DIR, "reports.json");
const MARKETS_PATH = path.join(DATA_DIR, "markets.override.json");

const COMPETITION_ID = "17";
const SEASON_ID = "285023";

const TOURNAMENT_PAGE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026";
const PAGE_API_URL =
  "https://cxm-api.fifa.com/fifaplusweb/api/pages/en/tournaments/mens/worldcup/canadamexicousa2026?locale=en";
const CALENDAR_BASE_URL = "https://api.fifa.com/api/v3/calendar/matches";

const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";
const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const ODDS_BOOKMAKERS = (process.env.ODDS_BOOKMAKERS || "pinnacle,williamhill,betvictor,betfair_sb_uk")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const TEAM_ZH = {
  Algeria: "阿尔及利亚",
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Austria: "奥地利",
  Belgium: "比利时",
  "Bosnia and Herzegovina": "波黑",
  Brazil: "巴西",
  "Cabo Verde": "佛得角",
  Cameroon: "喀麦隆",
  Canada: "加拿大",
  Chile: "智利",
  Colombia: "哥伦比亚",
  "Congo DR": "刚果（金）",
  "Costa Rica": "哥斯达黎加",
  Croatia: "克罗地亚",
  "Côte d'Ivoire": "科特迪瓦",
  Curaçao: "库拉索",
  Czechia: "捷克",
  Denmark: "丹麦",
  Ecuador: "厄瓜多尔",
  Egypt: "埃及",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Ghana: "加纳",
  Haiti: "海地",
  "IR Iran": "伊朗",
  Iraq: "伊拉克",
  Italy: "意大利",
  Japan: "日本",
  Jordan: "约旦",
  "Korea Republic": "韩国",
  Mexico: "墨西哥",
  Morocco: "摩洛哥",
  Netherlands: "荷兰",
  Norway: "挪威",
  Panama: "巴拿马",
  Paraguay: "巴拉圭",
  Peru: "秘鲁",
  Poland: "波兰",
  Portugal: "葡萄牙",
  Qatar: "卡塔尔",
  "Republic of Ireland": "爱尔兰",
  "Saudi Arabia": "沙特",
  Scotland: "苏格兰",
  Senegal: "塞内加尔",
  "South Africa": "南非",
  Spain: "西班牙",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  Tunisia: "突尼斯",
  Turkey: "土耳其",
  Türkiye: "土耳其",
  Ukraine: "乌克兰",
  Uruguay: "乌拉圭",
  USA: "美国",
  "United States": "美国",
  Uzbekistan: "乌兹别克斯坦",
  Wales: "威尔士",
  "New Zealand": "新西兰"
};

const TEAM_ALIASES = {
  usa: ["united states", "usa", "us"],
  "korea republic": ["korea republic", "south korea", "korea"],
  czechia: ["czechia", "czech republic"],
  turkey: ["turkey", "turkiye", "türkiye"],
  "cote divoire": ["côte d'ivoire", "cote d'ivoire", "ivory coast"],
  curacao: ["curaçao", "curacao"],
  iran: ["ir iran", "iran"]
};

const STATUS_LABELS = {
  upcoming: "未开赛",
  live: "进行中",
  finished: "已结束"
};

function pickText(value) {
  if (Array.isArray(value)) {
    return (
      value.find((item) => String(item?.Locale || "").toLowerCase().startsWith("en"))?.Description ||
      value[0]?.Description ||
      ""
    );
  }
  return value?.Description || value || "";
}

function teamNameZh(name) {
  return TEAM_ZH[String(name || "").trim()] || String(name || "").trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameTeamName(left, right) {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  for (const aliases of Object.values(TEAM_ALIASES)) {
    const normalized = aliases.map(normalizeName);
    if (normalized.includes(a) && normalized.includes(b)) return true;
  }
  return false;
}

function formatInTimeZone(date, timeZone) {
  return new Intl.DateTimeFormat("zh-CN", {
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
}

function formatIsoShanghai(date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${mapped.year}-${mapped.month}-${mapped.day}T${mapped.hour}:${mapped.minute}:${mapped.second}+08:00`;
}

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(PROBE_DIR, { recursive: true });
}

async function readOptionalJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return {};
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "worldcup-report-bot/4.0",
      accept: "application/json,text/plain,*/*"
    }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

function buildCalendarCandidates() {
  return [
    `${CALENDAR_BASE_URL}?IdCompetition=${COMPETITION_ID}&IdSeason=${SEASON_ID}&count=500`,
    `${CALENDAR_BASE_URL}?IdCompetition=${COMPETITION_ID}&IdSeason=${SEASON_ID}&MatchStates=1,2,3&count=500`,
    `${CALENDAR_BASE_URL}?IdSeason=${SEASON_ID}&count=500`
  ];
}

async function fetchWorldCupMatches() {
  const attempts = [];
  for (const url of buildCalendarCandidates()) {
    try {
      const payload = await fetchJson(url);
      const results = Array.isArray(payload.Results) ? payload.Results : [];
      const matched = results.filter(
        (item) => String(item.IdCompetition) === COMPETITION_ID && String(item.IdSeason) === SEASON_ID
      );
      attempts.push({ url, total: results.length, matched: matched.length });
      if (matched.length > 0) {
        await fs.writeFile(
          path.join(PROBE_DIR, "last_success_calendar.json"),
          JSON.stringify({ url, attempts, sampleCount: matched.length }, null, 2),
          "utf8"
        );
        return matched;
      }
    } catch (error) {
      attempts.push({ url, error: error.message });
    }
  }
  await fs.writeFile(
    path.join(PROBE_DIR, "last_failed_calendar_attempts.json"),
    JSON.stringify(attempts, null, 2),
    "utf8"
  );
  throw new Error("未能从 FIFA 官方接口筛出 2026 世界杯比赛。");
}

async function fetchPageJson() {
  const page = await fetchJson(PAGE_API_URL);
  await fs.writeFile(path.join(PROBE_DIR, "worldcup_page_runtime.json"), JSON.stringify(page, null, 2), "utf8");
  return page;
}

async function fetchNewsItems(pageJson) {
  const section = (pageJson.sections || []).find((item) => item.entryType === "news" && item.entryEndpoint);
  if (!section) return [];
  const endpoint = String(section.entryEndpoint).replace(/([?&])limit=\d+/i, "$1limit=50");
  const url = `https://cxm-api.fifa.com/fifaplusweb/api${endpoint}`;
  const payload = await fetchJson(url);
  await fs.writeFile(path.join(PROBE_DIR, "worldcup_news_runtime.json"), JSON.stringify(payload, null, 2), "utf8");
  return Array.isArray(payload.items) ? payload.items : [];
}

async function discoverOddsSportKey() {
  const url = `${ODDS_API_BASE_URL}/sports/?apiKey=${encodeURIComponent(ODDS_API_KEY)}&all=true`;
  const sports = await fetchJson(url);
  const exact = (Array.isArray(sports) ? sports : []).find(
    (item) =>
      item &&
      item.group === "Soccer" &&
      item.has_outrights === false &&
      /fifa world cup/i.test(`${item.title || ""} ${item.description || ""} ${item.key || ""}`)
  );
  return exact?.key || null;
}

function chooseBookmaker(event) {
  const list = Array.isArray(event.bookmakers) ? event.bookmakers : [];
  for (const preferred of ODDS_BOOKMAKERS) {
    const hit = list.find((item) => item?.key === preferred);
    if (hit) return hit;
  }
  return list[0] || null;
}

function findMarket(bookmaker, key) {
  return (bookmaker?.markets || []).find((item) => item?.key === key) || null;
}

function formatH2HMarket(match, market) {
  if (!market?.outcomes?.length) return null;
  const home = market.outcomes.find((item) => sameTeamName(item.name, pickText(match.Home?.TeamName)));
  const away = market.outcomes.find((item) => sameTeamName(item.name, pickText(match.Away?.TeamName)));
  const draw = market.outcomes.find((item) => normalizeName(item.name) === "draw");
  const parts = [];
  if (home) parts.push(`主胜 ${home.price}`);
  if (draw) parts.push(`平 ${draw.price}`);
  if (away) parts.push(`客胜 ${away.price}`);
  return parts.length > 0 ? parts.join(" / ") : null;
}

function formatSpreadMarket(match, market) {
  if (!market?.outcomes?.length) return null;
  const home = market.outcomes.find((item) => sameTeamName(item.name, pickText(match.Home?.TeamName)));
  const away = market.outcomes.find((item) => sameTeamName(item.name, pickText(match.Away?.TeamName)));
  if (!home || !away || home.point == null || away.point == null) return null;
  return `${teamNameZh(pickText(match.Home?.TeamName))} ${home.point} @ ${home.price} / ${teamNameZh(pickText(match.Away?.TeamName))} ${away.point} @ ${away.price}`;
}

function formatTotalsMarket(market) {
  if (!market?.outcomes?.length) return null;
  const over = market.outcomes.find((item) => normalizeName(item.name) === "over");
  const under = market.outcomes.find((item) => normalizeName(item.name) === "under");
  if (!over || !under || over.point == null) return null;
  return `大 ${over.point} @ ${over.price} / 小 ${under.point} @ ${under.price}`;
}

function probabilitiesFromH2H(market, match) {
  if (!market?.outcomes?.length) return null;
  const home = market.outcomes.find((item) => sameTeamName(item.name, pickText(match.Home?.TeamName)));
  const away = market.outcomes.find((item) => sameTeamName(item.name, pickText(match.Away?.TeamName)));
  const draw = market.outcomes.find((item) => normalizeName(item.name) === "draw");
  const values = [home, draw, away]
    .filter(Boolean)
    .map((item) => ({ key: item === home ? "home" : item === draw ? "draw" : "away", value: 1 / Number(item.price) }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0);
  if (values.length < 2) return null;
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const result = { home: 0, draw: 0, away: 0 };
  for (const item of values) {
    result[item.key] = Math.round((item.value / total) * 100);
  }
  return result;
}

function recommendationFromMarkets(match, h2hMarket, totalsMarket, bookmakerTitle) {
  const home = h2hMarket?.outcomes?.find((item) => sameTeamName(item.name, pickText(match.Home?.TeamName)));
  const away = h2hMarket?.outcomes?.find((item) => sameTeamName(item.name, pickText(match.Away?.TeamName)));
  if (!home || !away) return `${bookmakerTitle || "主流盘口"}已接入，但当前市场不完整。`;
  const diff = 1 / Number(home.price) - 1 / Number(away.price);
  const totalPoint = totalsMarket?.outcomes?.find((item) => normalizeName(item.name) === "over")?.point;
  if (diff > 0.05) return `${bookmakerTitle || "主流盘口"}略偏主队，若让球不继续深开，主队不败更稳。`;
  if (diff < -0.05) return `${bookmakerTitle || "主流盘口"}略偏客队，若受让水位持续下压，客队方向更强。`;
  if (totalPoint != null) return `${bookmakerTitle || "主流盘口"}总进球基准在 ${totalPoint}，需结合首发再判断大小球。`;
  return `${bookmakerTitle || "主流盘口"}显示胜负接近，当前更适合回避方向盘。`;
}

function movementSummary(previous, current) {
  if (!previous) return "首次抓到该场可验证盘口快照，后续更新将对比升降盘与水位变化。";
  const changes = [];
  if (previous.asianHandicap && current.asianHandicap && previous.asianHandicap !== current.asianHandicap) {
    changes.push(`让球由「${previous.asianHandicap}」变为「${current.asianHandicap}」`);
  }
  if (previous.overUnder && current.overUnder && previous.overUnder !== current.overUnder) {
    changes.push(`大小球由「${previous.overUnder}」变为「${current.overUnder}」`);
  }
  if (previous.oneXTwo && current.oneXTwo && previous.oneXTwo !== current.oneXTwo) {
    changes.push(`1X2 由「${previous.oneXTwo}」变为「${current.oneXTwo}」`);
  }
  return changes.length > 0 ? `与上一轮快照相比：${changes.join("；")}。` : "与上一轮快照相比，主流盘口未见明显变化。";
}

function buildMarketModelNote(match, marketData) {
  if (!marketData) return null;
  const parts = [];
  if (marketData.probabilities) {
    parts.push(
      `赔率归一化后主胜 ${marketData.probabilities.home || 0}% / 平局 ${marketData.probabilities.draw || 0}% / 客胜 ${marketData.probabilities.away || 0}%。`
    );
  }
  if (marketData.asianHandicap) {
    parts.push(`当前可验证亚洲让球为 ${marketData.asianHandicap}。`);
  }
  if (marketData.overUnder) {
    parts.push(`大小球基准为 ${marketData.overUnder}。`);
  }
  parts.push("若盘口方向与临场首发一致，可优先参考盘口强弱；若首发和盘口背离，应降低下注强度。");
  return parts.join("");
}

function buildMarketRisk(marketData) {
  if (!marketData) {
    return "当前最大风险在于盘口与临场伤停仍可能继续波动，使用前应结合最新首发和最新盘口快照。";
  }
  const warnings = [];
  if (!marketData.asianHandicap) warnings.push("让球盘不完整");
  if (!marketData.overUnder) warnings.push("大小球不完整");
  if (!marketData.oneXTwo) warnings.push("1X2 不完整");
  if (!warnings.length) {
    return "当前已有可验证盘口，但临场最后一跳水位、首发变动和伤停仍可能改变判断，赛前 60-90 分钟需再复核一次。";
  }
  return `当前盘口源已接入，但仍存在${warnings.join("、")}；使用前需结合其它主流公司和临场首发二次确认。`;
}

function matchOddsEvent(match, oddsEvents) {
  const home = pickText(match.Home?.TeamName);
  const away = pickText(match.Away?.TeamName);
  const kickoff = new Date(match.Date || match.LocalDate).getTime();
  return (
    oddsEvents.find((event) => {
      const sameTeams = sameTeamName(event.home_team, home) && sameTeamName(event.away_team, away);
      if (!sameTeams) return false;
      const eventTime = new Date(event.commence_time).getTime();
      return Math.abs(eventTime - kickoff) <= 12 * 3600000;
    }) || null
  );
}

async function fetchOddsMarkets(matches, existingOverrides) {
  if (!ODDS_API_KEY) {
    throw new Error("盘口层未配置 ODDS_API_KEY，当前不允许跳过盘口更新。");
  }
  if (/你的apikey|your[_ -]?api[_ -]?key/i.test(ODDS_API_KEY)) {
    throw new Error("ODDS_API_KEY 仍然是占位文字，不是实际可用的盘口源密钥。");
  }

  const sportKey = await discoverOddsSportKey();
  if (!sportKey) {
    throw new Error("已连接盘口源，但未发现可用的世界杯足球 sport key。");
  }

  const url =
    `${ODDS_API_BASE_URL}/sports/${encodeURIComponent(sportKey)}/odds/` +
    `?apiKey=${encodeURIComponent(ODDS_API_KEY)}` +
    `&bookmakers=${encodeURIComponent(ODDS_BOOKMAKERS.join(","))}` +
    `&markets=${encodeURIComponent("h2h,spreads,totals")}` +
    `&oddsFormat=decimal&dateFormat=iso&includeLinks=true`;

  const oddsEvents = await fetchJson(url);
  await fs.writeFile(path.join(PROBE_DIR, "odds_last_success.json"), JSON.stringify({ sportKey, url }, null, 2), "utf8");

  const byMatchId = { ...(existingOverrides.byMatchId || existingOverrides) };

  for (const match of matches) {
    const event = matchOddsEvent(match, Array.isArray(oddsEvents) ? oddsEvents : []);
    if (!event) continue;

    const bookmaker = chooseBookmaker(event);
    if (!bookmaker) continue;

    const h2hMarket = findMarket(bookmaker, "h2h");
    const spreadMarket = findMarket(bookmaker, "spreads");
    const totalsMarket = findMarket(bookmaker, "totals");

    const nextEntry = {
      bookmaker: bookmaker.title || bookmaker.key,
      bookmakerKey: bookmaker.key,
      fetchedAt: new Date().toISOString(),
      oneXTwo: formatH2HMarket(match, h2hMarket),
      asianHandicap: formatSpreadMarket(match, spreadMarket),
      overUnder: formatTotalsMarket(totalsMarket),
      probabilities: probabilitiesFromH2H(h2hMarket, match),
      recommendation: recommendationFromMarkets(match, h2hMarket, totalsMarket, bookmaker.title || bookmaker.key),
      analysis: `${bookmaker.title || bookmaker.key} 为当前优先可验证盘口源。${spreadMarket ? "已返回让球数据。" : "未返回让球数据。"}${totalsMarket ? "已返回大小球数据。" : "未返回大小球数据。"}`,
      sources: [
        {
          label: `赔率源：${bookmaker.title || bookmaker.key}`,
          url: bookmaker.link || "https://the-odds-api.com/"
        }
      ]
    };

    const previous = byMatchId[String(match.IdMatch)] || null;
    nextEntry.marketRead = [
      `${bookmaker.title || bookmaker.key} 可验证盘口快照`,
      nextEntry.asianHandicap ? `亚洲让球 ${nextEntry.asianHandicap}` : "亚洲让球暂未返回",
      nextEntry.overUnder ? `大小球 ${nextEntry.overUnder}` : "大小球暂未返回",
      nextEntry.oneXTwo ? `1X2 ${nextEntry.oneXTwo}` : "1X2 暂未返回",
      nextEntry.analysis
    ].join("；");
    nextEntry.marketMovement = movementSummary(previous, nextEntry);

    byMatchId[String(match.IdMatch)] = {
      ...(previous || {}),
      ...nextEntry
    };
  }

  const merged = {
    fetchedAt: new Date().toISOString(),
    source: "the-odds-api",
    byMatchId
  };
  await fs.writeFile(MARKETS_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

function matchStatus(match, now) {
  const kickoff = new Date(match.Date || match.LocalDate);
  const diffHours = (kickoff.getTime() - now.getTime()) / 3600000;
  if (match.MatchTime != null || (diffHours <= 0.2 && diffHours >= -4)) return "live";
  if (diffHours < -4) return "finished";
  return "upcoming";
}

function currentScoreLabel(match, status) {
  const home = Number(match.HomeTeamScore ?? match.Home?.Score ?? 0);
  const away = Number(match.AwayTeamScore ?? match.Away?.Score ?? 0);
  if (status === "upcoming") return "未开赛";
  const minute = match.MatchTime != null ? ` ${match.MatchTime}'` : "";
  return `${home}-${away}${minute}`;
}

function stageCompetitionLabel(match) {
  const stage = pickText(match.StageName);
  const group = pickText(match.GroupName);
  const bits = ["2026 世界杯"];
  if (stage) bits.push(stage);
  if (group) bits.push(group);
  return bits.join(" / ");
}

function buildMatchCentreUrl(match) {
  if (match.MatchReportUrl && /^https?:/i.test(match.MatchReportUrl)) return match.MatchReportUrl;
  return `https://www.fifa.com/en/match-centre/match/${COMPETITION_ID}/${SEASON_ID}/${match.IdStage}/${match.IdMatch}`;
}

function scoreNewsItem(match, item) {
  const tags = Array.isArray(item.semanticTags) ? item.semanticTags : [];
  const itemTeams = new Set(
    tags
      .filter((tag) => tag?.sourceCategory === "Team" || tag?.sourceCategory === "Association")
      .map((tag) => String(tag.title || "").trim())
      .filter(Boolean)
  );
  const matchIdFromTag = tags.find((tag) => tag?.sourceCategory === "Match")?.id;
  let score = 0;
  if (String(matchIdFromTag || "") === String(match.IdMatch)) score += 8;
  const home = pickText(match.Home?.TeamName);
  const away = pickText(match.Away?.TeamName);
  if (itemTeams.has(home)) score += 3;
  if (itemTeams.has(away)) score += 3;
  if (tags.some((tag) => String(tag?.id || "") === SEASON_ID)) score += 1;
  if (tags.some((tag) => String(tag?.id || "") === COMPETITION_ID)) score += 1;
  return score;
}

function selectNews(match, newsItems) {
  return newsItems
    .map((item) => ({ item, score: scoreNewsItem(match, item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.item.publishedDate || 0).getTime() - new Date(a.item.publishedDate || 0).getTime();
    })
    .slice(0, 3)
    .map((entry) => entry.item);
}

function compactList(items, fallback) {
  return items.length > 0 ? items : [fallback];
}

function buildProbabilities(status) {
  if (status === "live") return { home: 33, draw: 34, away: 33 };
  if (status === "finished") return { home: 0, draw: 0, away: 0 };
  return { home: 34, draw: 32, away: 34 };
}

function buildScorePrediction(status, match) {
  if (status === "finished" || status === "live") {
    return `${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}`;
  }
  return "待盘口与首发确认后更新";
}

function buildSources(match, relatedNews, marketData) {
  const sources = [
    { label: "FIFA 世界杯专题页", url: TOURNAMENT_PAGE_URL },
    { label: "FIFA 比赛中心", url: buildMatchCentreUrl(match) }
  ];
  for (const item of relatedNews) {
    sources.push({
      label: `FIFA 新闻：${item.title}`,
      url: `https://www.fifa.com${item.articlePageUrl}`
    });
  }
  for (const source of marketData?.sources || []) {
    sources.push(source);
  }
  const unique = [];
  const seen = new Set();
  for (const source of sources) {
    if (!source?.url || seen.has(source.url)) continue;
    seen.add(source.url);
    unique.push(source);
  }
  return unique;
}

function buildReport(match, newsItems, marketOverrides, now) {
  const kickoffUtc = new Date(match.Date || match.LocalDate);
  const localKickoff = new Date(match.LocalDate || match.Date);
  const status = matchStatus(match, now);
  const homeEn = pickText(match.Home?.TeamName);
  const awayEn = pickText(match.Away?.TeamName);
  const relatedNews = selectNews(match, newsItems);
  const marketData =
    marketOverrides[String(match.IdMatch)] ||
    marketOverrides[`${slugify(homeEn)}-${slugify(awayEn)}`] ||
    null;

  const news = relatedNews.map((item) => {
    const published = item.publishedDate ? formatInTimeZone(new Date(item.publishedDate), "Asia/Shanghai") : "";
    return `${item.title}：${item.previewText || "FIFA 官方更新。"}${published ? `（发布时间：${published} 北京时间）` : ""}`;
  });

  const referee = (match.Officials || []).find((item) => Number(item.OfficialType) === 1);
  const refereeName = pickText(referee?.NameShort || referee?.Name);
  const venueText = [pickText(match.Stadium?.Name), pickText(match.Stadium?.CityName)].filter(Boolean).join(" / ");

  return {
    id: `${slugify(homeEn)}-${slugify(awayEn)}-${String(kickoffUtc.toISOString()).slice(0, 10)}`,
    competition: stageCompetitionLabel(match),
    homeTeam: teamNameZh(homeEn),
    awayTeam: teamNameZh(awayEn),
    kickoffLocal: formatInTimeZone(localKickoff, "UTC"),
    kickoffBeijing: formatInTimeZone(kickoffUtc, "Asia/Shanghai"),
    venue: venueText || "待确认",
    status,
    statusLabel: STATUS_LABELS[status],
    currentScore: currentScoreLabel(match, status),
    score: status === "upcoming" ? null : `${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}`,
    recommendation:
      status === "finished"
        ? "比赛已结束，以复盘为主。"
        : status === "live"
          ? "比赛进行中，临场波动大，建议以实时信息为主。"
          : marketData?.recommendation || "当前未接入可验证盘口，暂不输出方向性推荐。",
    probabilities: marketData?.probabilities || buildProbabilities(status),
    scorePrediction: marketData?.scorePrediction || buildScorePrediction(status, match),
    snapshot: compactList(
      [
        `比赛状态：${STATUS_LABELS[status]}，当前比分 ${currentScoreLabel(match, status)}。`,
        `比赛信息：${pickText(match.StageName) || "阶段待定"}${pickText(match.GroupName) ? `，${pickText(match.GroupName)}` : ""}。`,
        `开球时间：当地时间 ${formatInTimeZone(localKickoff, "UTC")}，北京时间 ${formatInTimeZone(kickoffUtc, "Asia/Shanghai")}。`,
        venueText ? `场地：${venueText}。` : ""
      ].filter(Boolean),
      "FIFA 官方比赛数据已接入。"
    ),
    news: compactList(news, "暂无匹配到更具体的 FIFA 官方相关新闻。"),
    marketRead:
      marketData?.marketRead ||
      "当前脚本已接通 FIFA 官方赛程与实时比分，但尚未接通稳定且可验证的盘口源。",
    marketMovement:
      marketData?.marketMovement ||
      "盘口变化模块当前无可验证快照。",
    lineup: compactList(
      [
        "优先等待开赛前 60-90 分钟的官方首发。",
        status === "live" ? "比赛已进入实时阶段，建议直接以 FIFA 比赛中心首发页为准。" : "",
        status === "upcoming" ? "若临场出现核心球员退出或阵型突变，应立即下调判断强度。" : ""
      ].filter(Boolean),
      "暂无可验证首发。"
    ),
    formData: compactList(
      [
        `FIFA 已确认本场属于 2026 世界杯，比赛编号 ${match.IdMatch}。`,
        `阶段编号 ${match.IdStage}${match.IdGroup ? `，小组编号 ${match.IdGroup}` : ""}。`,
        status === "finished"
          ? `完场比分 ${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}。`
          : status === "live"
            ? `当前实时比分 ${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}。`
            : `官方开球时间为 ${formatInTimeZone(kickoffUtc, "Asia/Shanghai")} 北京时间。`
      ],
      "暂无更多可验证数据。"
    ),
    factors: compactList(
      [
        venueText ? `场地因素：${venueText}。` : "",
        refereeName ? `裁判：${refereeName}。` : "",
        match.Attendance ? `现场人数：${match.Attendance}。` : ""
      ].filter(Boolean),
      "暂无更多官方场地因素。"
    ),
    modelNote:
      status === "upcoming"
        ? "当前已覆盖全部世界杯比赛；如盘口、首发和伤停继续补齐，这里会转为逐场更细分析。"
        : "当前记录以官方赛况、比分、裁判、场地和相关新闻为主，用于实时跟踪和复盘。",
    risk:
      "当前最大风险在于盘口与临场伤停仍可能继续波动，使用前应结合最新首发和最新盘口快照。",
    sources: buildSources(match, relatedNews, marketData)
  };
}

function buildReportEnhanced(match, newsItems, marketOverrides, now) {
  const kickoffUtc = new Date(match.Date || match.LocalDate);
  const localKickoff = new Date(match.LocalDate || match.Date);
  const status = matchStatus(match, now);
  const homeEn = pickText(match.Home?.TeamName);
  const awayEn = pickText(match.Away?.TeamName);
  const teamsPending = !homeEn || !awayEn;
  const relatedNews = selectNews(match, newsItems);
  const marketData =
    marketOverrides[String(match.IdMatch)] ||
    marketOverrides[`${slugify(homeEn)}-${slugify(awayEn)}`] ||
    null;
  const hasMarket = Boolean(marketData);
  const pendingReason = "参赛球队尚未确定，需待上一轮结束后才能补齐阵容、伤停、盘口与逐场分析。";

  const news = relatedNews.map((item) => {
    const published = item.publishedDate ? formatInTimeZone(new Date(item.publishedDate), "Asia/Shanghai") : "";
    return `${item.title}：${item.previewText || "FIFA 官方更新。"}${published ? `（发布时间：${published} 北京时间）` : ""}`;
  });

  const referee = (match.Officials || []).find((item) => Number(item.OfficialType) === 1);
  const refereeName = pickText(referee?.NameShort || referee?.Name);
  const venueText = [pickText(match.Stadium?.Name), pickText(match.Stadium?.CityName)].filter(Boolean).join(" / ");

  return {
    id: `${slugify(homeEn)}-${slugify(awayEn)}-${String(kickoffUtc.toISOString()).slice(0, 10)}`,
    competition: stageCompetitionLabel(match),
    homeTeam: teamNameZh(homeEn) || "待定",
    awayTeam: teamNameZh(awayEn) || "待定",
    kickoffLocal: formatInTimeZone(localKickoff, "UTC"),
    kickoffBeijing: formatInTimeZone(kickoffUtc, "Asia/Shanghai"),
    venue: venueText || "待确认",
    status,
    statusLabel: STATUS_LABELS[status],
    currentScore: currentScoreLabel(match, status),
    score: status === "upcoming" ? null : `${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}`,
    recommendation: teamsPending
      ? pendingReason
      : status === "finished"
        ? "比赛已结束，应以赛后复盘为主。"
        : status === "live"
          ? "比赛进行中，临场波动较大，应以实时信息为主。"
          : marketData?.recommendation || "当前未抓到可验证盘口，暂不输出方向性推荐。",
    probabilities: marketData?.probabilities || buildProbabilities(status),
    scorePrediction: teamsPending ? "待对阵确定后更新" : marketData?.scorePrediction || buildScorePrediction(status, match),
    snapshot: compactList(
      [
        teamsPending ? pendingReason : "",
        `比赛状态：${STATUS_LABELS[status]}，当前比分 ${currentScoreLabel(match, status)}。`,
        `比赛信息：${pickText(match.StageName) || "阶段待定"}${pickText(match.GroupName) ? `，${pickText(match.GroupName)}` : ""}。`,
        `开球时间：当地时间 ${formatInTimeZone(localKickoff, "UTC")}，北京时间 ${formatInTimeZone(kickoffUtc, "Asia/Shanghai")}。`,
        venueText ? `场地：${venueText}。` : ""
      ].filter(Boolean),
      "FIFA 官方比赛数据已接入。"
    ),
    news: compactList(news, teamsPending ? "球队待定阶段通常只有赛程级官方更新，待对阵落位后再补逐场新闻。" : "暂无更具体的 FIFA 官方相关新闻。"),
    marketRead: teamsPending
      ? "参赛球队未确定，因此当前不输出盘口解读；待上一轮结束且盘口开出后自动补齐。"
      : marketData?.marketRead || "当前已接通 FIFA 官方赛程与实时比分，但这场尚未抓到稳定且可验证的盘口源。",
    marketMovement: teamsPending
      ? "当前无可比较的盘口变化，因为参赛双方尚未落位。"
      : marketData?.marketMovement || "当前暂无可验证的盘口变化快照。",
    lineup: compactList(
      [
        teamsPending ? pendingReason : "",
        "优先等待开赛前 60-90 分钟的官方首发。",
        status === "live" ? "比赛已进入实时阶段，首发与换人应以 FIFA 比赛中心为准。" : "",
        status === "upcoming" && !teamsPending ? "若临场出现核心球员退出或阵型突变，应立即下调判断强度。" : ""
      ].filter(Boolean),
      "暂无可验证首发。"
    ),
    formData: compactList(
      [
        hasMarket && !teamsPending && marketData?.probabilities
          ? `赔率归一化概率：主胜 ${marketData.probabilities.home || 0}% / 平局 ${marketData.probabilities.draw || 0}% / 客胜 ${marketData.probabilities.away || 0}%。`
          : "",
        `FIFA 已确认本场属于 2026 世界杯，比赛编号 ${match.IdMatch}。`,
        `阶段编号 ${match.IdStage}${match.IdGroup ? `，小组编号 ${match.IdGroup}` : ""}。`,
        status === "finished"
          ? `完场比分 ${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}。`
          : status === "live"
            ? `当前实时比分 ${Number(match.HomeTeamScore ?? 0)}-${Number(match.AwayTeamScore ?? 0)}。`
            : `官方开球时间为 ${formatInTimeZone(kickoffUtc, "Asia/Shanghai")} 北京时间。`
      ],
      "暂无更多可验证数据。"
    ),
    factors: compactList(
      [
        teamsPending ? "当前只可确认赛程、场地与赛时信息，球队层面的战意、对位与伤停需待对阵确定后再评估。" : "",
        hasMarket && !teamsPending ? "当前盘口已接入，可结合亚洲让球、大小球与 1X2 是否同向来判断市场预期。" : "",
        venueText ? `场地因素：${venueText}。` : "",
        refereeName ? `裁判：${refereeName}。` : "",
        match.Attendance ? `现场人数：${match.Attendance}。` : ""
      ].filter(Boolean),
      "暂无更多官方场地因素。"
    ),
    modelNote: teamsPending
      ? pendingReason
      : hasMarket
        ? buildMarketModelNote(match, marketData)
        : status === "upcoming"
          ? "这场已纳入全量赛程，但由于盘口、首发和伤停信息仍不完整，当前只能保留赛程级判断，不输出强结论。"
          : "当前记录以官方赛况、比分、裁判、场地和相关 FIFA 新闻为主，用于实时跟踪和赛后复盘。",
    risk: teamsPending
      ? "球队尚未确定前，任何胜负、比分和盘口判断都没有可比性，当前只应把它当作赛程占位卡片。"
      : buildMarketRisk(marketData),
    sources: buildSources(match, relatedNews, marketData)
  };
}

async function main() {
  await ensureDirs();
  const now = new Date();
  const existingMarketsPayload = await readOptionalJson(MARKETS_PATH);
  const [matches, pageJson] = await Promise.all([fetchWorldCupMatches(), fetchPageJson()]);
  const mergedMarkets = await fetchOddsMarkets(matches, existingMarketsPayload);
  const marketOverrides = mergedMarkets.byMatchId || mergedMarkets || {};
  const newsItems = await fetchNewsItems(pageJson);

  const reports = matches
    .slice()
    .sort((a, b) => new Date(a.Date || a.LocalDate).getTime() - new Date(b.Date || b.LocalDate).getTime())
    .map((match) => buildReportEnhanced(match, newsItems, marketOverrides, now));

  const payload = {
    updatedAt: formatIsoShanghai(now),
    timezone: "Asia/Shanghai",
    reports
  };

  await fs.writeFile(REPORTS_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`REPORTS_OK ${reports.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
