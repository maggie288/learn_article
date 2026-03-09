# PaperFlow 核心差异化 — 实现状态

本文档对照 `paperflow-architecture.md` 中的**护城河**与**最低课程标准**，说明当前代码的实现情况。便于判断「课程效果差」是缺配置，还是缺功能。

---

## 一、大模型 Key 的影响

**结论：没配 `ANTHROPIC_API_KEY` 会明显拉低课程质量，但配了也达不到「最低标准」。**

| 环节 | 无 Key 时 | 有 Key 时 |
|------|-----------|-----------|
| **提取 (extractPaperInsights)** | 使用 `createMockExtraction`：概念来自论文章节标题，definition = 章节前 220 字，thinkingChain = 章节标题 + 前 260 字。没有真正的论文理解。 | 调用 Claude，产出 concepts / edges / thinkingChain，概念图与思维链有语义。 |
| **路径生成** | 基于上述 mock 概念做拓扑排序与难度筛选，章节结构偏「按 section 顺序」。 | 基于真实概念图做拓扑 + ZPD 式递进，章节顺序更合理。 |
| **章节叙述 (Narrator)** | **无论有无 Key，Narrator 都不调 LLM**。当前实现是：`intro + 本章 concept 的 definition 拼接 + 前 2 条 thinkingChain`。所以内容始终是「一句 intro + 几段概念定义 + 两条推理」，没有按节展开的讲解。 | 同上。Key 只影响 extraction 质量，不影响 Narrator 的写法。 |

因此：

- **先配好 `ANTHROPIC_API_KEY`**：至少能得到真实概念图和路径，课程骨架和章节概要会好很多。
- **要达到「最低标准」**（类似 [transformer-explainer](transformer-explainer)：分节标题、类比、问题、机制、突破、多段讲解），需要：
  - Narrator 改为**调用 LLM**，按「节」生成多段内容（analogy / problem / mechanism / breakthrough 等）；
  - 或引入多 Agent（Narrator / Analogist / Visualizer 等）按架构文档实现。

---

## 二、最低课程标准 vs 当前实现

参考你给的「最低标准」：transformer-explainer 式结构。

| 维度 | 最低标准（transformer-explainer） | 当前实现 |
|------|-----------------------------------|----------|
| **结构** | 多节（如：为什么、核心概念、多头注意力、整体架构），每节有 icon + title + subtitle | 每章一个标题 + 一段 narration，无「节」结构 |
| **内容类型** | 每节内多块：analogy / problem / significance / mechanism / breakthrough 等 | 只有「intro + 概念 definition 拼接 + 2 条 thinking」 |
| **讲解方式** | 生活类比、困境、为什么重要、Q/K/V、公式一句话解释 | 无专门类比/公式解释，只有原始 definition 文本 |
| **图示** | 无（参考里是文字为主） | 有占位「本章图示（生成引擎接入后显示）」；无 SVG 生成管道 |
| **朗读** | — | 有：本章朗读 + 每段朗读（浏览器 TTS） |

结论：**当前管线只做到「单章单段文字 + 分段落展示 + 朗读」；没有「分节 + 多类型块 + LLM 讲解」，所以达不到 transformer-explainer 的最低标准。** 差的是**内容生成设计**（Narrator 用 LLM、多节多块），不是只差 key。

---

## 三、护城河实现状态（对照架构 1.4）

| 护城河 | 架构说明 | 实现状态 | 说明 |
|--------|----------|----------|------|
| **自验证引擎** | 每份课程通过五道自动化质量关卡 | ⚠️ **部分实现** | **覆盖率**：章节 narration 是否提及概念（启发式）。**前置完备性**：概念图中边 (from, to) 满足 to 首次出现章节 ≤ from 首次出现章节的比例。**verification_logs**：每项检查写入一条记录。忠实度/教学质量/白板考试仍为固定分，待接入 LLM/NLI/rubric。 |
| **累积知识图谱** | 每处理一篇论文，全局概念图谱增长 | ✅ **已实现** | `updateGlobalConceptGraph(extraction.conceptGraph)` 在课程发布后调用，将 concepts/edges 合并进全局 `concepts` 与 `concept_edges` 表。 |
| **可视化教学** | SVG 交互图 + 语音 + 文字三位一体 | ⚠️ **部分** | **文字**：有，但内容薄（见上）。**语音**：仅浏览器 TTS；无管道 TTS（如 ElevenLabs）与 `audio_url`。**SVG**：前端有占位与展示逻辑；管道内无 Visualizer Agent，无 `svg_components` 生成。 |
| **三层难度自适配** | 同一篇论文 Explorer/Builder/Researcher 自动适配 | ⚠️ **部分** | 路径有难度配置（userLevel、maxConceptsPerChapter）；Narrator 仅一句 intro 随难度变化，**没有**按难度生成不同深度/长度的讲解。 |
| **路径生成靠算法** | 拓扑排序 + ZPD + 认知负荷，可复现可调参 | ✅ **部分实现** | **拓扑**：用 inDegree + queue 做依赖排序。**ZPD**：用 `userLevel` 过滤概念并随学习更新。**认知负荷**：有 maxConceptsPerChapter 等，但未在文档中显式命名为「认知负荷」约束。 |

---

## 四、建议的下一步（优先级）

1. **配置 `ANTHROPIC_API_KEY`**  
   立刻提升提取与路径质量；课程仍会偏薄，但比 mock 好很多。

2. **Narrator 已接入 LLM**  
   有 Key 时使用 `createNarrationForChapterWithLLM`（Claude），产出讲解稿 + citations；无 Key 时仍用模板。可选后续：单章内多节、多块（类比/问题/机制）向 transformer-explainer 靠拢。

3. **自验证引擎**  
   已有 `runVerificationPipeline` 占位（覆盖率启发式 + 固定分），发布前执行并写入 `qualityScores`。后续可接入真实五道关卡（LLM/NLI/rubric/白板考试）及自动修复。

4. **全局知识图谱**  
   已实现 `updateGlobalConceptGraph`，课程发布后合并到 `concepts` / `concept_edges`。

5. **可视化 + 语音管道**  
   Visualizer Agent 产出每章 `svg_components`；TTS 管道产出 `audio_url`；前端已支持展示。

6. **Layer 6 多形态**  
   **博客**：`renderBlogFromChapters` + 发布时写入 `blog_html`；`/paper/[slug]/blog` 页；`GET /api/courses/:id/blog`。**播客**：`/paper/[slug]/podcast` 页（有 `podcastUrl` 时全课程播放器 + 章节列表）；`GET /api/courses/:id/podcast` 重定向；`GET /api/courses/:id/podcast/rss`。**短视频**：`POST /api/courses/:id/export-short-video` 返回 202 占位。

7. **测验**  
   章节若有 `quizQuestions`，ChapterQuizSubmit 展示选项并提交答案；API 按 `correct` 判分并写入 `quizScore`，前端显示得分。

8. **Connector**  
   合并本论文提取边与全局 `getGlobalConceptEdges(conceptNames)` 查询结果，去重后作为 connections。

---

*文档与代码一致：以 `paperflow-architecture.md` 为产品权威，本文件仅描述当前实现与差距。*
