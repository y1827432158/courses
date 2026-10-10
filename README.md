# 课程导航

一个零依赖的静态页，用来集中存放我在上的课的**课件、录播、论文清单和作业仓库**。

打开：<https://y1827432158.github.io/courses/>

## 现在收录

| 课程 | 学校 | 学期 | 内容 |
| --- | --- | --- | --- |
| 11-768 · AI Agents | 卡内基梅隆大学 | Fall 2026 | 13 份课件、9 讲录播、39 条必读 + 256 条延伸参考、3 份作业仓库 |

## 页面能做什么

- **课程切换** — 顶部标签，以后加课就在这儿多一个
- **搜索**（按 `/` 聚焦）— 可搜讲次标题、日期、讲师，也可搜论文名
- **筛选** — 全部 / 有课件 / 有录播 / 待更新 / 有论文
- **点「阅读」展开** — 每讲的必读与延伸参考清单，arXiv 链接带标记
- **随官网更新** — 官方还没放出的讲次标「待更新」

## 目录结构

```
.
├── index.html              页面骨架
├── assets/
│   ├── style.css           样式（配色与笔记站同一套）
│   └── app.js              渲染逻辑，无框架无依赖
├── data/
│   ├── courses.js          课程索引 —— 新增课程在这里加一行
│   └── cmu-11-768.js       课程数据
└── .github/workflows/deploy.yml   push 到 main 自动发布
```

## 怎么加一门新课

1. 复制 `data/cmu-11-768.js`，改名为 `data/<你的课程 id>.js`
2. 改文件里的 `window.COURSE_['<id>'] = {...}`，按字段填内容
3. 在 `data/courses.js` 的 `courses` 数组里加一条：

```js
{
  id: 'mit-6-824',                 // 唯一 id，也是网址里的 #/mit-6-824
  emoji: '🧪',
  code: '6.824',
  name: 'Distributed Systems',
  school_zh: '麻省理工学院',
  term: 'Spring 2026',
  file: 'data/mit-6-824.js',       // 指向第 1 步的文件
  blurb: '一句话题目简介'
}
```

4. `git push`，Pages 会自动重新发布。

### 课程数据的字段

必填只有一个 `sessions`，其余都可省略（省略就不显示那一块）。

| 字段 | 说明 |
| --- | --- |
| `code` / `name` / `school_zh` / `school` / `term` | 标题区显示的信息 |
| `instructors` | 字符串数组 |
| `emoji` | 标题和标签上的图标 |
| `note` | 标题下方的说明条 |
| `links` | `[{label, url}]`，标题下的快捷按钮 |
| `cn_subs` | `[{label, url}]`，中文字幕/配音等 |
| `extra_links` | `[{label, url}]`，镜像与整理 |
| `assignments` | `[{n, title, due, repo, desc}]` |
| `grading` | `[{component, weight, format}]` |
| `sessions` | 见下 |

`sessions` 每一项：

```js
{
  code: '1a',                  // 角标，如 1a / 3b
  date: 'Tue, Aug 25',
  title: 'Course Overview: What Is an Agent?',
  module: 'Introduction',      // 相同的会归到同一组
  lecturer: 'JY Koh',          // 可选
  kind: 'lecture',             // lecture | break | project
  slides: 'https://...pdf',    // 没有就留 null
  video: 'https://youtu.be/..',// 没有就留 null
  readings:   [{label, url}],  // 必读
  references: [{label, url}]   // 延伸参考
}
```

## 本地预览

数据用 `<script>` 标签载入（不是 `fetch`），所以**直接双击 `index.html` 就能看**。
如果浏览器拦了本地脚本，起个服务也行：

```bash
python -m http.server 8000
# 然后打开 http://localhost:8000
```

## 数据来源

`data/cmu-11-768.js` 里的课表、课件链接、录播链接和论文清单，取自课程官方站点
[cmu-agents.com](https://www.cmu-agents.com/) 的前端 JS 包，抓取时间 2026-10-10。
官网是 React 单页应用，直接抓 HTML 拿不到内容，所以是从它的 bundle 里解出来的。

官方材料版权归原作者；这里只做链接汇总。
