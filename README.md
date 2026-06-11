# 世界杯赛前情报网页

这是一个静态网页，用来展示每天自动更新的世界杯赛前中文情报。页面读取的数据文件是 `data/reports.json`，可以直接发布到 GitHub Pages。

## 当前结构

- `index.html`：页面骨架
- `styles.css`：页面样式
- `app.js`：前端渲染逻辑
- `generate_reports.mjs`：抓取比赛并生成中文 `reports.json`
- `update_worldcup_reports.ps1`：一键生成、校验、按需推送
- `data/reports.json`：网页实际使用的数据文件

## 本地预览

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
```

浏览器打开：

```text
http://localhost:8787
```

## 生成中文动态报告

直接运行：

```powershell
node .\generate_reports.mjs
```

脚本会：

1. 从 ESPN 世界杯赛程接口抓未来约 36 小时比赛
2. 抓天气
3. 抓 Google News RSS 新闻
4. 结合可选覆盖源，生成中文 `data/reports.json`

## 一键更新与发布

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\update_worldcup_reports.ps1
```

这个脚本会：

1. 运行 `generate_reports.mjs`
2. 校验 `data/reports.json` 可解析
3. 如果当前目录是 Git 仓库且已配置 `origin`，自动调用 `publish_report.ps1` 提交并推送

## 可选覆盖源

默认情况下，脚本会尽量从公开源拼装中文报告。如果你手里有更稳定的数据源，可以额外放这几个文件：

- `data/markets.override.json`
- `data/form.override.json`
- `data/lineups.override.json`

脚本会自动读取它们并覆盖对应字段。

### `markets.override.json` 示例

```json
{
  "123456": {
    "asianHandicap": "主队 -0.75 低水",
    "overUnder": "2.25",
    "movement": "初盘主队 -0.5，当前升到 -0.75，主队水位下行。",
    "sourceUrl": "https://example.com/odds/match-123456",
    "sourceLabel": "自定义盘口源"
  }
}
```

这里的 `123456` 可以用比赛事件 id，也可以用：

```text
Mexico__South Africa
墨西哥__南非
```

### `form.override.json` 示例

```json
{
  "墨西哥__南非": {
    "items": [
      "墨西哥近 6 场 4 胜 1 平 1 负，场均进球 1.8。",
      "南非近 6 场 2 胜 2 平 2 负，面对高压逼抢出球稳定性一般。"
    ]
  }
}
```

### `lineups.override.json` 示例

```json
{
  "墨西哥__南非": {
    "items": [
      "墨西哥：主力门将确认出战，中锋赛前恢复良好，预计首发。",
      "南非：主力中卫停赛，反击速度点具备出场条件。"
    ]
  }
}
```

## 发布到 GitHub Pages

如果你新建的是干净仓库，根目录结构应当是：

```text
index.html
app.js
styles.css
data/reports.json
```

然后在 GitHub 仓库里：

1. 打开 `Settings -> Pages`
2. `Source` 选 `Deploy from a branch`
3. `Branch` 选 `main`
4. `Folder` 选 `/(root)`
5. 保存

## 说明

- 页面现在是中文界面
- 动态内容由 `generate_reports.mjs` 生成
- 若某些盘口或阵容源不可验证，脚本会明确写出“暂缺/需临场复核”，而不是伪造实时信息
