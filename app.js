<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>世界杯赛前情报板</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <header class="topbar">
      <div class="hero-copy">
        <p class="eyebrow">2026 年世界杯</p>
        <h1>世界杯赛前情报板</h1>
        <p class="hero-note">
          以盘口判断为中心，集中展示首发确认、预期进球质量、定位球、
          裁判尺度、天气与旅途恢复等高价值信息。
        </p>
      </div>
      <div class="status-block">
        <div class="status" id="updatedAt">正在读取更新...</div>
        <div class="status-sub">覆盖未来 36 小时比赛</div>
      </div>
    </header>

    <main class="layout">
      <section class="toolbar" aria-label="筛选报告">
        <button class="seg active" data-filter="all" type="button">全部</button>
        <button class="seg" data-filter="today" type="button">今日</button>
        <button class="seg" data-filter="tomorrow" type="button">明日</button>
      </section>

      <section class="legend">
        <div class="legend-card">
          <strong>临场首发信号</strong>
          <span>门将、中卫、后腰、中锋是否齐整</span>
        </div>
        <div class="legend-card">
          <strong>盘口一致性</strong>
          <span>亚盘、水位、大小球、1X2 是否同向</span>
        </div>
        <div class="legend-card">
          <strong>比分驱动因子</strong>
          <span>xG、定位球、裁判、天气、旅途消耗</span>
        </div>
      </section>

      <section id="reports" class="reports" aria-live="polite"></section>
      <section id="emptyState" class="empty-state" hidden>
        <h2>暂无未来 36 小时比赛</h2>
        <p>自动更新完成后，这里会展示接下来 36 小时内的赛前报告。</p>
      </section>
    </main>

    <template id="reportTemplate">
      <article class="match-card">
        <div class="match-head">
          <div>
            <p class="competition"></p>
            <h2 class="match-title"></h2>
            <p class="kickoff"></p>
          </div>
          <div class="head-side">
            <div class="match-status"></div>
            <div class="current-score"></div>
            <div class="pick"></div>
          </div>
        </div>

        <div class="quick-grid">
          <div><span>主胜</span><strong class="home-win"></strong></div>
          <div><span>平局</span><strong class="draw"></strong></div>
          <div><span>客胜</span><strong class="away-win"></strong></div>
          <div><span>比分判断</span><strong class="score"></strong></div>
        </div>

        <section class="signal-panel">
          <div class="section-head">
            <h3>高级预测信号</h3>
            <p>把最影响胜负与比分的临场变量单独拎出来看。</p>
          </div>
          <div class="signal-grid"></div>
        </section>

        <details open>
          <summary>赛前情报快照</summary>
          <ul class="snapshot"></ul>
        </details>

        <details>
          <summary>最新新闻与可用性</summary>
          <ul class="news"></ul>
        </details>

        <details open>
          <summary>盘口解读</summary>
          <p class="market"></p>
        </details>

        <details open>
          <summary>盘口变化与市场热度</summary>
          <p class="market-movement"></p>
        </details>

        <details>
          <summary>阵容与伤停</summary>
          <ul class="lineup"></ul>
        </details>

        <details>
          <summary>近期状态与数据</summary>
          <ul class="form-data"></ul>
        </details>

        <details>
          <summary>影响因素</summary>
          <ul class="factors"></ul>
        </details>

        <details>
          <summary>模型判断</summary>
          <p class="model-note"></p>
        </details>

        <details>
          <summary>投注风险提示</summary>
          <p class="risk"></p>
        </details>

        <footer class="sources-wrap">
          <div class="sources-title">信息来源</div>
          <div class="sources"></div>
        </footer>
      </article>
    </template>

    <script src="app.js"></script>
  </body>
</html>
