# Erklärung und Empfehlung

**Session ID:** ses_14787de88ffeyQp8f6pWWrZRBi
**Created:** 6/11/2026, 10:55:41 PM
**Updated:** 6/11/2026, 11:17:48 PM

---

## User

Was ist das hier eigentlich? würdest du mir das empfehlen? 

---

## Assistant (Plan · MiMo V2.5 Free · 3.8s)

_Thinking:_

The user is asking "Was ist das hier eigentlich? würdest du mir das empfehlen?" which is German for "What is this actually? Would you recommend it to me?"

They're asking about the current project/directory they're in. Let me first understand what's in this project by reading the relevant files. I should look at the README and understand what this project is about.

Let me start by reading the AGENTS.md and SKILL.md files that were referenced in the system prompt, and then explore the project structure.

Ich schaue mir das Projekt an, um dir eine fundierte Empfehlung geben zu können.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main</path>
<type>directory</type>
<entries>
.agents/
.claude-plugin/
.codex/
.gitattributes
.github/
.gitignore
.junie/
.kiro/
.roo/
AGENTS.md
agents/
benchmarks/
bin/
CLAUDE.md
commands/
CONTRIBUTING.md
dist/
docs/
evals/
gemini-extension.json
GEMINI.md
INSTALL.md
install.ps1
install.sh
LICENSE
package.json
plugins/
README.md
skills-lock.json
skills/
src/
tests/

(32 entries)
</entries>
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/*.md",
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main"
}
```

**Output:**
```
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/GEMINI.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/AGENTS.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/CONTRIBUTING.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/INSTALL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/CLAUDE.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/docs/install-windows.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/evals/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/agents/cavecrew-reviewer.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/agents/cavecrew-investigator.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/agents/cavecrew-builder.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-stats/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-stats/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-commit/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-commit/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-help/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-help/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/todo-list.original.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/todo-list.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/project-notes.original.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/project-notes.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/mixed-with-code.original.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/mixed-with-code.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/claude-md-project.original.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/claude-md-project.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/claude-md-preferences.original.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/tests/caveman-compress/claude-md-preferences.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-review/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-review/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/rules/caveman-activate.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/rules/caveman-openclaw-bootstrap.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/agents/cavecrew-investigator.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/agents/cavecrew-builder.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/agents/cavecrew-reviewer.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/cavecrew/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/cavecrew/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-compress/SECURITY.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-compress/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/hooks/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-compress/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/mcp-servers/caveman-shrink/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/skills/caveman/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/skills/caveman-compress/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/skills/caveman-stats/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/plugins/caveman/skills/cavecrew/SKILL.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-review.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-help.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-commit.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-stats.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman.md
```

**Tool: glob**

**Input:**
```json
{
  "pattern": "**/package.json",
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main"
}
```

**Output:**
```
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/package.json
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/package.json
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/hooks/package.json
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/mcp-servers/caveman-shrink/package.json
```

---

## Assistant (Plan · MiMo V2.5 Free · 2.4s)

_Thinking:_

Let me read the README.md and package.json to understand what this project is about.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/README.md"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/README.md</path>
<type>file</type>
<content>
1: <p align="center">
2:   <img src="https://em-content.zobj.net/source/apple/391/rock_1faa8.png" width="120" />
3: </p>
4: 
5: <h1 align="center">caveman</h1>
6: 
7: <p align="center">
8:   <strong>why use many token when few do trick</strong>
9: </p>
10: 
11: <p align="center">
12:   <a href="https://github.com/JuliusBrussee/caveman/stargazers"><img src="https://img.shields.io/github/stars/JuliusBrussee/caveman?style=flat&color=yellow" alt="Stars"></a>
13:   <a href="https://github.com/JuliusBrussee/caveman/commits/main"><img src="https://img.shields.io/github/last-commit/JuliusBrussee/caveman?style=flat" alt="Last Commit"></a>
14:   <a href="LICENSE"><img src="https://img.shields.io/github/license/JuliusBrussee/caveman?style=flat" alt="License"></a>
15: </p>
16: 
17: <p align="center">
18:   <a href="#before--after">Before/After</a> •
19:   <a href="#install">Install</a> •
20:   <a href="#what-you-get">What You Get</a> •
21:   <a href="#benchmarks">Benchmarks</a> •
22:   <a href="./INSTALL.md">Full install guide</a>
23: </p>
24: 
25: ---
26: 
27: A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill/plugin (also Codex, Gemini, Cursor, Windsurf, Cline, Copilot, 30+ more) that makes agent talk like caveman — cuts **~75% of output tokens**, keeps full technical accuracy. Brain still big. Mouth small.
28: 
29: ## Before / After
30: 
31: <table>
32: <tr>
33: <td width="50%">
34: 
35: ### 🗣️ Normal Claude (69 tokens)
36: 
37: > "The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object."
38: 
39: </td>
40: <td width="50%">
41: 
42: ### <img src="docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman Claude (19 tokens)
43: 
44: > "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
45: 
46: </td>
47: </tr>
48: <tr>
49: <td>
50: 
51: ### 🗣️ Normal Claude
52: 
53: > "Sure! I'd be happy to help you with that. The issue you're experiencing is most likely caused by your authentication middleware not properly validating the token expiry. Let me take a look and suggest a fix."
54: 
55: </td>
56: <td>
57: 
58: ### <img src="docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman Claude
59: 
60: > "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"
61: 
62: </td>
63: </tr>
64: </table>
65: 
66: **Same fix. 75% less word. Brain still big.**
67: 
68: ```
69: ┌─────────────────────────────────────┐
70: │  TOKENS SAVED          ████████ 75% │
71: │  TECHNICAL ACCURACY    ████████ 100%│
72: │  SPEED INCREASE        ████████ ~3x │
73: │  VIBES                 ████████ OOG │
74: └─────────────────────────────────────┘
75: ```
76: 
77: Pick your level of grunt — `lite` (drop filler), `full` (default caveman), `ultra` (telegraphic), or `wenyan` (classical Chinese, even shorter). One command switch. Cost go down forever.
78: 
79: <table align="center">
80: <tr><td>
81: 
82: ### <img src="docs/assets/dancing-rock.svg" width="22" height="22" alt="rock"/> Like this trick? Now get whole agent — **caveman-code**
83: 
84: This skill shrink what agent **say**. **[caveman-code](https://github.com/JuliusBrussee/caveman-code)** shrink **everything** — full terminal coding agent, caveman top to bottom. **~2× fewer tokens than Codex** on identical tasks. 20+ providers · plan mode · autopilot goal loop · MIT.
85: 
86: ```bash
87: npm install -g @juliusbrussee/caveman-code
88: ```
89: 
90: [**▶ Try caveman-code now →**](https://github.com/JuliusBrussee/caveman-code) — *why use many token when whole agent save*
91: 
92: </td></tr>
93: </table>
94: 
95: ## Install
96: 
97: One line. Find every agent. Install for each.
98: 
99: ```bash
100: # macOS / Linux / WSL / Git Bash
101: curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
102: 
103: # Windows (PowerShell 5.1+)
104: irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
105: ```
106: 
107: ~30 seconds. Needs Node ≥18. Skip agent you no have. Safe to re-run.
108: 
109: **Trigger:** type `/caveman` or say "talk like caveman". Stop with "normal mode".
110: 
111: One agent only, manual command, or any of 30+ other agents → [**INSTALL.md**](./INSTALL.md).
112: Install break? Open agent, say *"Read CLAUDE.md and INSTALL.md, install caveman for me."* Agent fix own brain.
113: 
114: ## What You Get
115: 
116: | Skill | What |
117: |---|---|
118: | `/caveman [lite\|full\|ultra\|wenyan]` | Compress every reply. Levels stick until session end. |
119: | `/caveman-commit` | Conventional Commit messages, ≤50 char subject. Why over what. |
120: | `/caveman-review` | One-line PR comments: `L42: 🔴 bug: user null. Add guard.` |
121: | `/caveman-stats` | Real session token usage + lifetime savings + USD. Tweetable line via `--share`. |
122: | `/caveman-compress <file>` | Rewrite memory file (e.g. `CLAUDE.md`) into caveman-speak. Cuts ~46% input tokens every session. Code/URLs/paths byte-preserved. |
123: | `caveman-shrink` | MCP middleware. Wraps any MCP server, compresses tool descriptions. [npm](https://www.npmjs.com/package/caveman-shrink). |
124: | `cavecrew-*` | Caveman subagents (investigator/builder/reviewer). ~60% fewer tokens than vanilla, main context lasts longer. |
125: 
126: **Statusline badge** — Claude Code shows `[CAVEMAN] ⛏ 12.4k` (lifetime tokens saved). Updates every `/caveman-stats` run. Set `CAVEMAN_STATUSLINE_SAVINGS=0` to silence.
127: 
128: Auto-activate every session: Claude Code, Codex, Gemini (built-in). Cursor / Windsurf / Cline / Copilot get always-on rule files via `--with-init`. Other agents trigger with `/caveman` per session. Full feature matrix in [INSTALL.md](./INSTALL.md#what-you-get).
129: 
130: ## Benchmarks
131: 
132: Real token counts from the Claude API. Average **65% output reduction** across 10 prompts (range 22-87%).
133: 
134: <!-- BENCHMARK-TABLE-START -->
135: | Task | Normal | Caveman | Saved |
136: |------|-------:|--------:|------:|
137: | Explain React re-render bug | 1180 | 159 | 87% |
138: | Fix auth middleware token expiry | 704 | 121 | 83% |
139: | Set up PostgreSQL connection pool | 2347 | 380 | 84% |
140: | Explain git rebase vs merge | 702 | 292 | 58% |
141: | Refactor callback to async/await | 387 | 301 | 22% |
142: | Architecture: microservices vs monolith | 446 | 310 | 30% |
143: | Review PR for security issues | 678 | 398 | 41% |
144: | Docker multi-stage build | 1042 | 290 | 72% |
145: | Debug PostgreSQL race condition | 1200 | 232 | 81% |
146: | Implement React error boundary | 3454 | 456 | 87% |
147: | **Average** | **1214** | **294** | **65%** |
148: <!-- BENCHMARK-TABLE-END -->
149: 
150: Raw data and reproduction script: [`benchmarks/`](./benchmarks/). Three-arm eval harness (baseline / terse / skill) lives in [`evals/`](./evals/) — caveman compared against `Answer concisely.` not against verbose default, so the delta is honest.
151: 
152: **caveman-compress receipts** (real memory files):
153: 
154: | File | Original | Compressed | Saved |
155: |---|---:|---:|---:|
156: | `claude-md-preferences.md` | 706 | 285 | **59.6%** |
157: | `project-notes.md` | 1145 | 535 | **53.3%** |
158: | `claude-md-project.md` | 1122 | 636 | **43.3%** |
159: | `todo-list.md` | 627 | 388 | **38.1%** |
160: | `mixed-with-code.md` | 888 | 560 | **36.9%** |
161: | **Average** | **898** | **481** | **46%** |
162: 
163: > [!IMPORTANT]
164: > Caveman only affects output tokens — thinking/reasoning tokens untouched. Caveman no make brain smaller. Caveman make *mouth* smaller. Biggest win is **readability and speed**, cost savings a bonus.
165: 
166: A March 2026 paper ["Brevity Constraints Reverse Performance Hierarchies in Language Models"](https://arxiv.org/abs/2604.00025) found that constraining large models to brief responses **improved accuracy by 26 points** on certain benchmarks. Verbose not always better. Sometimes less word = more correct.
167: 
168: ## How It Work
169: 
170: 1. Install drop skill file in agent.
171: 2. Skill tell agent: drop filler, keep substance, use fragments.
172: 3. For Claude Code, hook also write tiny flag file each session — agent see flag, talk caveman from message one. No need say `/caveman`.
173: 4. Stats command read Claude Code session log, count tokens saved, write number to statusline.
174: 5. Caveman-compress sub-skill rewrite memory files (CLAUDE.md, project notes) so each session start with smaller context. Save tokens forever, not just one reply.
175: 
176: Maintainer detail (hook architecture, file ownership, CI sync) live in [CLAUDE.md](./CLAUDE.md).
177: 
178: ## Lobster, Meet Rock 🦞 <img src="docs/assets/dancing-rock.svg" width="22" height="22" alt="rock"/>
179: 
180: [**OpenClaw**](https://openclaw.ai) the self-host gateway. One box, many agent inside (Claude Code, Codex, Pi, OpenCode), wired to your Slack / Discord / iMessage / Telegram / whatever. Tagline: *"The lobster way."* Lobster strong. Lobster smart. Lobster also talk a lot.
181: 
182: Caveman teach lobster brevity — same canonical installer, scoped to one agent:
183: 
184: ```bash
185: # macOS / Linux / WSL
186: curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash -s -- --only openclaw
187: 
188: # Windows (PowerShell): no Node? install Node ≥18 first, then
189: npx -y github:JuliusBrussee/caveman -- --only openclaw
190: ```
191: 
192: Two thing happen, no more:
193: 
194: 1. **Skill drop** at `~/.openclaw/workspace/skills/caveman/SKILL.md` — spec-correct frontmatter (`version`, `always: true`), discoverable by `openclaw skills list`. Skill not auto-inject (OpenClaw load skill on demand) — that why we also do step 2.
195: 2. **SOUL.md nudge.** Tiny marker-fenced block appended to `~/.openclaw/workspace/SOUL.md`. OpenClaw inject SOUL.md into *every* turn under "Project Context" (12K-per-file, 60K total — block well under). Lobster terse from message one. No `/caveman` per session. No nag.
196: 
197: ```
198: ~/.openclaw/workspace/
199: ├── skills/caveman/SKILL.md   ← full ruleset, on-demand load
200: └── SOUL.md                    ← <!-- caveman-begin --> ... <!-- caveman-end -->
201:                                   ↑ auto-inject every turn
202: ```
203: 
204: Custom workspace path? `OPENCLAW_WORKSPACE=/your/path` before the command. Uninstall: same one-liner with `--uninstall` — skill folder gone, SOUL.md block ripped out cleanly, your other workspace content stay untouched. Idempotent re-runs (frontmatter not double-prepended, marker block not duplicated).
205: 
206: Lobster claw still sharp. Lobster mouth now small. Brain still big.
207: 
208: ## Caveman Ecosystem
209: 
210: Five tools. One philosophy: **agent do more with less**.
211: 
212: | Repo | What |
213: |------|------|
214: | [**caveman**](https://github.com/JuliusBrussee/caveman) *(you here)* | Output compression — *why use many token when few do trick* |
215: | [**caveman-code**](https://github.com/JuliusBrussee/caveman-code) | Whole terminal coding agent — *why use many token when whole agent can save* |
216: | [**cavemem**](https://github.com/JuliusBrussee/cavemem) | Cross-agent memory — *why agent forget when agent can remember* |
217: | [**cavekit**](https://github.com/JuliusBrussee/cavekit) | Spec-driven build loop — *why agent guess when agent can know* |
218: | [**cavegemma**](https://github.com/JuliusBrussee/finetune-caveman) | Gemma 4 31B fine-tuned on caveman pairs — *why prompt every turn when weight remember* |
219: 
220: Compose: cavekit drive build, caveman compress what agent *say*, cavemem compress what agent *remember*, cavegemma bake compression into weight, caveman-code ship it all as one terminal agent. One rock. Two rock. Three rock. Four rock. Five rock. That it.
221: 
222: ## Links
223: 
224: - [INSTALL.md](./INSTALL.md) — full install matrix, all flags, per-agent detail
225: - [CONTRIBUTING.md](./CONTRIBUTING.md) — how to send patch
226: - [CLAUDE.md](./CLAUDE.md) — maintainer guide (file ownership, hook architecture, CI)
227: - [docs/](./docs/) — extra guides (Windows install, etc.)
228: - [Issues](https://github.com/JuliusBrussee/caveman/issues) — bug, feature, weird behavior
229: 
230: ## Star This Repo
231: 
232: Caveman save you token, save you money. Star cost zero. Fair trade. ⭐
233: 
234: [![Star History Chart](https://api.star-history.com/svg?repos=JuliusBrussee/caveman&type=Date)](https://star-history.com/#JuliusBrussee/caveman&Date)
235: 
236: ## Also by Julius Brussee
237: 
238: - **[Revu](https://github.com/JuliusBrussee/revu-swift)** — local-first macOS study app with FSRS spaced repetition. [revu.cards](https://revu.cards)
239: 
240: ## License
241: 
242: MIT — free like mass mammoth on open plain.

(End of file - total 242 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/package.json"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/package.json</path>
<type>file</type>
<content>
1: {
2:   "name": "caveman-installer",
3:   "version": "0.1.0",
4:   "description": "Caveman installer — detects your AI coding agents and installs caveman for each one.",
5:   "license": "MIT",
6:   "author": "Julius Brussee",
7:   "homepage": "https://github.com/JuliusBrussee/caveman",
8:   "repository": {
9:     "type": "git",
10:     "url": "git+https://github.com/JuliusBrussee/caveman.git"
11:   },
12:   "bugs": {
13:     "url": "https://github.com/JuliusBrussee/caveman/issues"
14:   },
15:   "bin": {
16:     "caveman": "./bin/install.js"
17:   },
18:   "engines": {
19:     "node": ">=18"
20:   },
21:   "scripts": {
22:     "test": "node --test tests/installer/*.test.mjs"
23:   },
24:   "files": [
25:     "bin/",
26:     "src/",
27:     "agents/",
28:     "skills/",
29:     "plugins/",
30:     "commands/",
31:     "dist/caveman.skill",
32:     "README.md",
33:     "LICENSE"
34:   ]
35: }

(End of file - total 35 lines)
</content>
```

---

## Assistant (Plan · MiMo V2.5 Free · 6.6s)

_Thinking:_

Now I have a good understanding of the project. Let me also check the skills directory to understand what it offers.

Das ist **caveman** – ein Open-Source-Skill/Plugin für AI-Coding-Agenten (Claude Code, Codex, Gemini, Cursor, Windsurf, Copilot u.v.m.). Es wurde von Julius Brussee entwickelt und komprimiert die Ausgabe deiner KI, damit sie "wie ein Höhlenmensch" spricht – kurze, prägnante Antworten statt ausschweifender Text.

## Was es macht

- **~75% weniger Output-Tokens** bei gleicher technischer Genauigkeit
- 4 Kompressionslevel: `lite`, `full`, `ultra`, `wenyan` (klassisches Chinesisch)
- `/caveman-commit` – Konventional Commits, `/caveman-review` – einzeilige PR-Kommentare
- `/caveman-stats` – zeigt Token-Ersparnis und USD-Kosten an
- Funktioniert mit 30+ AI-Agenten über ein einziges Install-Skript

## Empfehlung

**Ja, ich würde es empfehlen**, besonders wenn du:

1. **Kosten senken willst** – Weniger Tokens = weniger API-Kosten
2. **Schnellere Antworten bevorzugst** – Kürzere Responses laden schneller
3. **Viele Sessions pro Tag hast** – Die Ersparnis summiert sich

**Weniger sinnvoll** wenn du:
- Sehr detaillierte Erklärungen brauchst (z.B. beim Lernen)
- Die "persönliche Note" deiner KI schätzt

Die Benchmarks im Repo zeigen 22-87% Ersparnis je nach Task. Die Idee ist solide: Weniger Füllwörter bei gleichem Inhalt spart Token, ohne die Qualität zu beeinträchtigen.

---

## User

kann man die das plugin abdrehen, wenn man die nächste Antwort detaillierter haben möchte?

---

## Assistant (Plan · MiMo V2.5 Free · 2.6s)

_Thinking:_

The user is asking if they can turn off the plugin when they want a more detailed response for the next answer. Let me check how the caveman skill works - specifically if there's a way to disable it or switch to normal mode.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman/SKILL.md"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman/SKILL.md</path>
<type>file</type>
<content>
1: ---
2: name: caveman
3: description: >
4:   Ultra-compressed communication mode. Cuts token usage ~75% by speaking like caveman
5:   while keeping full technical accuracy. Supports intensity levels: lite, full (default), ultra,
6:   wenyan-lite, wenyan-full, wenyan-ultra.
7:   Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens",
8:   "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested.
9: ---
10: 
11: Respond terse like smart caveman. All technical substance stay. Only fluff die.
12: 
13: ## Persistence
14: 
15: ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".
16: 
17: Default: **full**. Switch: `/caveman lite|full|ultra`.
18: 
19: ## Rules
20: 
21: Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.
22: 
23: Pattern: `[thing] [action] [reason]. [next step].`
24: 
25: Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
26: Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"
27: 
28: ## Intensity
29: 
30: | Level | What change |
31: |-------|------------|
32: | **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight |
33: | **full** | Drop articles, fragments OK, short synonyms. Classic caveman |
34: | **ultra** | Abbreviate prose words (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X → Y), one word when one word enough. Code symbols, function names, API names, error strings: never abbreviate |
35: | **wenyan-lite** | Semi-classical. Drop filler/hedging but keep grammar structure, classical register |
36: | **wenyan-full** | Maximum classical terseness. Fully 文言文. 80-90% character reduction. Classical sentence patterns, verbs precede objects, subjects often omitted, classical particles (之/乃/為/其) |
37: | **wenyan-ultra** | Extreme abbreviation while keeping classical Chinese feel. Maximum compression, ultra terse |
38: 
39: Example — "Why React component re-render?"
40: - lite: "Your component re-renders because you create a new object reference each render. Wrap it in `useMemo`."
41: - full: "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."
42: - ultra: "Inline obj prop → new ref → re-render. `useMemo`."
43: - wenyan-lite: "組件頻重繪，以每繪新生對象參照故。以 useMemo 包之。"
44: - wenyan-full: "物出新參照，致重繪。useMemo .Wrap之。"
45: - wenyan-ultra: "新參照→重繪。useMemo Wrap。"
46: 
47: Example — "Explain database connection pooling."
48: - lite: "Connection pooling reuses open connections instead of creating new ones per request. Avoids repeated handshake overhead."
49: - full: "Pool reuse open DB connections. No new connection per request. Skip handshake overhead."
50: - ultra: "Pool = reuse DB conn. Skip handshake → fast under load."
51: - wenyan-full: "池reuse open connection。不每req新開。skip handshake overhead。"
52: - wenyan-ultra: "池reuse conn。skip handshake → fast。"
53: 
54: ## Auto-Clarity
55: 
56: Drop caveman when:
57: - Security warnings
58: - Irreversible action confirmations
59: - Multi-step sequences where fragment order or omitted conjunctions risk misread
60: - Compression itself creates technical ambiguity (e.g., `"migrate table drop column backup first"` — order unclear without articles/conjunctions)
61: - User asks to clarify or repeats question
62: 
63: Resume caveman after clear part done.
64: 
65: Example — destructive op:
66: > **Warning:** This will permanently delete all rows in the `users` table and cannot be undone.
67: > ```sql
68: > DROP TABLE users;
69: > ```
70: > Caveman resume. Verify backup exist first.
71: 
72: ## Boundaries
73: 
74: Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert. Level persist until changed or session end.

(End of file - total 74 lines)
</content>
```

---

## Assistant (Plan · MiMo V2.5 Free · 7.4s)

_Thinking:_

Now I have the answer. According to the SKILL.md, there are clear ways to turn off or adjust the caveman mode:

1. Say "stop caveman" or "normal mode" to turn it off completely
2. Use `/caveman lite` to get a lighter compression (keeps articles and full sentences)
3. There's also Auto-Clarity that drops caveman for security warnings, confirmations, etc.

Let me give a concise answer.

Ja, geht. Laut SKILL.md (`skills/caveman/SKILL.md:15`):

- **"stop caveman"** oder **"normal mode"** → schaltet es komplett aus
- **`/caveman lite`** → nur Füllwörter weg, aber vollständige Sätze (weniger aggressiv)
- **`/caveman full`** → Standard-Modus
- **`/caveman ultra`** → maximale Kompression

Die Level bleiben bis zum Session-ende aktiv. Wechsel ist sofort möglich – einfach `/caveman lite` oder "normal mode" schreiben.

Zusätzlich gibt es **Auto-Clarity** (Zeile 56-63): Bei Sicherheitswarnungen, unwiderruflichen Aktionen oder mehrschrittigen Sequenzen schaltet caveman automatisch auf normale Sprache um.

---

## User

wie aktiviere ich diesen skill?

---

## Assistant (Plan · MiMo V2.5 Free · 2.5s)

_Thinking:_

The user is asking how to activate the caveman skill. Let me check the INSTALL.md for installation instructions.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/INSTALL.md"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/INSTALL.md</path>
<type>file</type>
<content>
1: # Install caveman
2: 
3: One install. Works for every AI coding agent on your machine.
4: 
5: If just want it to work, run the one-liner. If want to know what gets touched, scroll down.
6: 
7: ## One-liner
8: 
9: **macOS / Linux / WSL / Git Bash**
10: 
11: ```bash
12: curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
13: ```
14: 
15: **Windows (PowerShell 5.1+)**
16: 
17: ```powershell
18: irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
19: ```
20: 
21: What it does:
22: 
23: - Auto-detects every supported agent installed on your machine (Claude Code, Cursor, Codex, etc.).
24: - For each one, runs that agent's native install path (plugin / extension / rule file / `npx skills add`).
25: - Wires Claude Code hooks, statusline badge, and the `caveman-shrink` MCP middleware on top.
26: - Skips anything you don't have. Safe to re-run. ~30 seconds end-to-end.
27: 
28: Want to preview before installing? Use `--dry-run`:
29: 
30: ```bash
31: curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash -s -- --dry-run
32: ```
33: 
34: ## Per-agent install
35: 
36: If you want to install for one agent (or want to know exactly what command runs under the hood), use the table below. Every row also works as `--only <id>` to the unified installer.
37: 
38: | Agent | Install command | Auto-activates? |
39: |---|---|:-:|
40: | **Claude Code** | `claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman` | Yes |
41: | **Gemini CLI** | `gemini extensions install https://github.com/JuliusBrussee/caveman` | Yes |
42: | **opencode** | `node bin/install.js --only opencode` *(or `npx -y github:JuliusBrussee/caveman -- --only opencode`)* | Yes (plugin + AGENTS.md) |
43: | **OpenClaw** | `npx -y github:JuliusBrussee/caveman -- --only openclaw` | Yes (workspace skill + SOUL.md) |
44: | **Codex CLI** | `npx skills add JuliusBrussee/caveman -a codex` | Per-session: `/caveman` |
45: | **Cursor** | `npx skills add JuliusBrussee/caveman -a cursor` | Per-session by default; `--with-init` for an always-on rule file |
46: | **Windsurf** | `npx skills add JuliusBrussee/caveman -a windsurf` | Per-session by default; `--with-init` for an always-on rule file |
47: | **Cline** | `npx skills add JuliusBrussee/caveman -a cline` | Per-session by default; `--with-init` for an always-on rule file |
48: | **GitHub Copilot** *(soft probe)* | `npx -y github:JuliusBrussee/caveman -- --only copilot --with-init` | Repo-wide instructions via `--with-init` |
49: | **Continue** | `npx skills add JuliusBrussee/caveman -a continue` | No — say `/caveman` |
50: | **Kilo Code** | `npx skills add JuliusBrussee/caveman -a kilo` | No |
51: | **Roo Code** | `npx skills add JuliusBrussee/caveman -a roo` | No |
52: | **Augment Code** | `npx skills add JuliusBrussee/caveman -a augment` | No |
53: | **Aider Desk** | `npx skills add JuliusBrussee/caveman -a aider-desk` | No |
54: | **Sourcegraph Amp** | `npx skills add JuliusBrussee/caveman -a amp` | No |
55: | **IBM Bob** | `npx skills add JuliusBrussee/caveman -a bob` | No |
56: | **Crush** | `npx skills add JuliusBrussee/caveman -a crush` | No |
57: | **Devin (terminal)** | `npx skills add JuliusBrussee/caveman -a devin` | No |
58: | **Droid (Factory)** | `npx skills add JuliusBrussee/caveman -a droid` | No |
59: | **ForgeCode** | `npx skills add JuliusBrussee/caveman -a forgecode` | No |
60: | **Block Goose** | `npx skills add JuliusBrussee/caveman -a goose` | No |
61: | **iFlow CLI** | `npx skills add JuliusBrussee/caveman -a iflow-cli` | No |
62: | **Kiro CLI** | `npx skills add JuliusBrussee/caveman -a kiro-cli` | No |
63: | **Mistral Vibe** | `npx skills add JuliusBrussee/caveman -a mistral-vibe` | No |
64: | **OpenHands** | `npx skills add JuliusBrussee/caveman -a openhands` | No |
65: | **Qwen Code** | `npx skills add JuliusBrussee/caveman -a qwen-code` | No |
66: | **Atlassian Rovo Dev** | `npx skills add JuliusBrussee/caveman -a rovodev` | No |
67: | **Tabnine CLI** | `npx skills add JuliusBrussee/caveman -a tabnine-cli` | No |
68: | **Trae** | `npx skills add JuliusBrussee/caveman -a trae` | No |
69: | **Warp** | `npx skills add JuliusBrussee/caveman -a warp` | No |
70: | **Replit Agent** | `npx skills add JuliusBrussee/caveman -a replit` | No |
71: | **JetBrains Junie** *(soft probe)* | `npx skills add JuliusBrussee/caveman -a junie` | No |
72: | **Qoder** *(soft probe)* | `npx skills add JuliusBrussee/caveman -a qoder` | No |
73: | **Google Antigravity** *(soft probe)* | `npx skills add JuliusBrussee/caveman -a antigravity` | No |
74: 
75: "Soft probe" = installer won't auto-detect these without `--only <id>` because there's no reliable always-on signal (Copilot subscription state is auth-gated; the others have no CLI / config-dir-only). Pass the flag when you want them.
76: 
77: For "auto-activates? No" agents, type `/caveman` once per session (or use natural-language triggers like "talk like caveman", "caveman mode").
78: 
79: Full agent matrix (with detection rules) is in `bin/install.js` under the `PROVIDERS` array.
80: 
81: ## Manual install (no `curl | bash`)
82: 
83: If you'd rather see exactly what runs:
84: 
85: ```bash
86: # Clone the repo
87: git clone https://github.com/JuliusBrussee/caveman.git
88: cd caveman
89: 
90: # Preview every command the installer would run
91: node bin/install.js --dry-run --all
92: 
93: # Inspect the agent matrix
94: node bin/install.js --list
95: 
96: # Install for everything detected
97: node bin/install.js --all
98: ```
99: 
100: Useful flags:
101: 
102: | Flag | What |
103: |---|---|
104: | `--all` | Plugin + hooks + statusline + MCP shrink + per-repo rule files in `$PWD`. The full ride. |
105: | `--minimal` | Plugin / extension only. No hooks, no MCP shrink, no per-repo rules. |
106: | `--only <id>` | One agent only. Repeatable: `--only claude --only cursor`. |
107: | `--dry-run` | Print every command. Write nothing. |
108: | `--with-init` | Drop always-on rule files into the current repo (`.cursor/`, `.windsurf/`, `.clinerules/`, `.github/copilot-instructions.md`, `.opencode/AGENTS.md`, `AGENTS.md`) and, if OpenClaw is on the box, append the bootstrap block to `~/.openclaw/workspace/SOUL.md`. |
109: | `--with-mcp-shrink` | Register `caveman-shrink` MCP proxy. **On by default.** |
110: | `--no-mcp-shrink` | Skip MCP-shrink registration. |
111: | `--with-hooks` / `--no-hooks` | Force-on or force-off the Claude Code hook installer. (Default: on.) |
112: | `--skip-skills` | Don't run the npx-skills auto-detect fallback when nothing else matched. |
113: | `--config-dir <path>` | Claude Code config dir for hook files + `settings.json`. **Does NOT scope** `claude plugin install`, `gemini extensions install`, opencode (`XDG_CONFIG_HOME`), or openclaw (`OPENCLAW_WORKSPACE`) — those use their own paths. Default: `$CLAUDE_CONFIG_DIR` or `~/.claude`. `~` is expanded. |
114: | `--non-interactive` | Never prompt; use defaults. (Auto when stdin is not a TTY.) |
115: | `--no-color` | Disable ANSI colors. |
116: | `--list` | Print full agent matrix and exit. |
117: | `--force` | Re-run even if already installed. |
118: | `--uninstall` | Remove everything. See below. |
119: 
120: ## Always-on rules
121: 
122: For agents without a hook system (Cursor, Windsurf, Cline, Copilot, and friends), the always-on path is a static rule file. Two ways:
123: 
124: ```bash
125: # Drop rule files into the current repo
126: node bin/install.js --with-init
127: 
128: # Or pull the rule body straight in (manual)
129: curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/src/rules/caveman-activate.md \
130:   > .cursor/rules/caveman.mdc   # or .windsurf/rules/caveman.md, .clinerules/caveman.md, .github/copilot-instructions.md
131: ```
132: 
133: `--with-init` writes the rule into every supported per-agent location it can detect (`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`, `.github/copilot-instructions.md`, `.opencode/AGENTS.md`, `AGENTS.md`). It also installs the OpenClaw workspace bootstrap (skill folder + SOUL.md marker block) when `~/.openclaw/workspace/` exists. Single source: [`src/rules/caveman-activate.md`](src/rules/caveman-activate.md).
134: 
135: ## Verify
136: 
137: After install, three quick checks:
138: 
139: **1. See what got installed.**
140: 
141: ```bash
142: node bin/install.js --list
143: ```
144: 
145: You should see ~30 rows. Detected agents are marked. Anything you wanted but isn't marked → not detected (likely the binary isn't on `PATH`).
146: 
147: **2. Talk to Claude Code.**
148: 
149: Open Claude Code, type `/caveman`. Response should be terse fragments — "Got it. Caveman mode on." or similar. Try a real question: "What is closures in JS?" — answer should drop articles and read like grunts.
150: 
151: **3. Check the flag file.**
152: 
153: ```bash
154: cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.caveman-active"
155: # expected output: full
156: ```
157: 
158: If it's missing or empty, the SessionStart hook didn't fire. See troubleshooting below.
159: 
160: Statusline should show `[CAVEMAN]` (orange) at the bottom of Claude Code. After your first `/caveman-stats` run it appends a savings counter like `[CAVEMAN] ⛏ 12.4k`.
161: 
162: ## Uninstall
163: 
164: ```bash
165: npx -y github:JuliusBrussee/caveman -- --uninstall
166: ```
167: 
168: What it removes:
169: 
170: - Caveman hook entries from `$CLAUDE_CONFIG_DIR/settings.json` (default `~/.claude/`; matched by the substring `caveman`).
171: - Hook files in `$CLAUDE_CONFIG_DIR/hooks/` (`caveman-activate.js`, `caveman-mode-tracker.js`, `caveman-stats.js`, `caveman-config.js`, `caveman-statusline.{sh,ps1}`, plus the dir's `package.json` marker).
172: - The Claude Code plugin and the Gemini CLI extension (if installed).
173: - The opencode native plugin (`~/.config/opencode/plugins/caveman/`, the `plugin` and `mcp.caveman-shrink` entries from `opencode.json`, our skill/agent/command files, the caveman block from `AGENTS.md`, and the opencode flag file).
174: - The OpenClaw workspace skill folder and the marker-fenced block from `~/.openclaw/workspace/SOUL.md` (when present).
175: - The `.caveman-active` flag file.
176: 
177: What it does **not** remove:
178: 
179: - Skills installed via `npx skills add` — the `skills` CLI manages those. Run `npx skills remove caveman` (or use your IDE's skill manager).
180: - Per-repo rule files written by `--with-init` (`.cursor/rules/`, `.windsurf/rules/`, `.clinerules/`, `.github/copilot-instructions.md`, `.opencode/AGENTS.md`, `AGENTS.md`). Delete by hand if you want.
181: 
182: ## Troubleshooting
183: 
184: **"Install script broke. What now?"**
185: 
186: Open your agent in this repo and say:
187: 
188: > "Read CLAUDE.md and INSTALL.md. Install caveman for me."
189: 
190: Agent read repo. Agent run install. Caveman make agent talk less — agent first job is install caveman to talk less. Snake eat tail.
191: 
192: Still broken? [Open an issue](https://github.com/JuliusBrussee/caveman/issues).
193: 
194: **"I ran the installer but Claude Code isn't talking caveman."**
195: 
196: 1. Run `node bin/install.js --list` — confirm `claude` is on the detected list. If not, `claude` isn't on `PATH`. Fix that first.
197: 2. Open `$CLAUDE_CONFIG_DIR/settings.json` (default `~/.claude/settings.json`) and look for `"hooks"` containing `caveman-activate.js` and `caveman-mode-tracker.js`. If missing, re-run with `--force`.
198: 3. Check `$CLAUDE_CONFIG_DIR/.caveman-active` exists with content `full`. If not, the SessionStart hook silent-failed — check `$CLAUDE_CONFIG_DIR/hooks/` for the JS files and try `node $CLAUDE_CONFIG_DIR/hooks/caveman-activate.js < /dev/null` to see if it errors.
199: 4. Restart Claude Code. The SessionStart hook only fires on session start, not mid-session.
200: 
201: **"Hooks failing on Windows."**
202: 
203: - Use `install.ps1`, not `install.sh`. Git Bash works for the shell version, but the hook side wires PowerShell counterparts (`caveman-statusline.ps1`).
204: - PowerShell 5.1 minimum. Check with `$PSVersionTable.PSVersion`.
205: - If `irm | iex` blocks on execution policy: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` for the install session, then re-run.
206: - Long-running issues: see `docs/install-windows.md` in the repo for manual fallback.
207: 
208: **"My `settings.json` got mangled."**
209: 
210: The installer uses a JSONC-tolerant parser (`bin/lib/settings.js`) so comments and trailing commas don't crash the merge. It also runs `validateHookFields()` before every write so a malformed hook can't poison the file. If something still went wrong:
211: 
212: 1. Check for a backup at `$CLAUDE_CONFIG_DIR/settings.json.bak` (installer writes one before any merge).
213: 2. If no backup, restore from your shell history or version control.
214: 3. File an issue with the broken `settings.json` content (redacted) — that file passing validation but breaking Claude Code is a bug we want to fix.
215: 
216: **"I'm in a managed env where I can't install hooks."**
217: 
218: Use the rule-file-only path. Hooks are Claude Code-specific; everything else works via static rule files:
219: 
220: ```bash
221: # Just install for one agent, no Claude hooks
222: node bin/install.js --only cursor
223: 
224: # Or write rule files into the current repo only (no global state)
225: node bin/install.js --with-init --only cursor --only windsurf
226: ```
227: 
228: This drops `.cursor/rules/caveman.mdc` (and friends) into your repo. No hooks, no global config, nothing outside the repo.
229: 
230: **"`npx skills add` errored on a profile slug."**
231: 
232: The profile slug must exist in [vercel-labs/skills](https://github.com/vercel-labs/skills). If a row in the table above 404s, the upstream profile was renamed or removed — open an issue, we'll update.
233: 
234: ## Privacy
235: 
236: The installer doesn't phone home. It writes to:
237: 
238: - `$CLAUDE_CONFIG_DIR` (default `~/.claude/`) — hooks, flag file, `settings.json` merge.
239: - Each agent's own config location — Cursor's `.cursor/rules/`, Windsurf's `.windsurf/rules/`, opencode's `~/.config/opencode/`, etc.
240: - Your current working directory (only with `--with-init`) — repo-local rule files.
241: - `~/.openclaw/workspace/` (only with `--only openclaw` or `--with-init` when OpenClaw is detected) — the one `--with-init` side-effect outside the cwd.
242: 
243: No telemetry. No analytics. The installer's own code makes no network calls. Network requests do happen indirectly through the per-agent CLIs it shells out to — `claude plugin marketplace add`, `claude plugin install`, `gemini extensions install`, `npm view caveman-shrink`, and `npx -y skills add`. Each fetches from its own registry (Anthropic / GitHub / npm). Source: [`bin/install.js`](bin/install.js).
244: 
245: ---
246: 
247: Stuck? Open an issue: <https://github.com/JuliusBrussee/caveman/issues>

(End of file - total 247 lines)
</content>
```

---

## Assistant (Plan · MiMo V2.5 Free · 5.7s)

_Thinking:_

Now I have the full installation instructions. Let me give a concise answer about how to activate the skill. The user is using opencode based on the context (the available skills list shows "customize-opencode" skill).

Am einfachsten per One-Liner:

```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```

Das erkennt automatisch alle installierten Agenten (Claude Code, Cursor, Codex etc.) und installiert caveman für jeden. Dauert ~30 Sekunden, braucht Node ≥18.

**Für opencode speziell:**
```bash
node bin/install.js --only opencode
```

Oder via npx:
```bash
npx -y github:JuliusBrussee/caveman -- --only opencode
```

Danach einfach `/caveman` tippen oder "talk like caveman" sagen – Modus ist aktiv.

**Vorschau ohne Installation:**
```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash -s -- --dry-run
```

Vollständige Docs in `INSTALL.md:7-18` (One-Liner) bzw. `INSTALL.md:34-78` (per-Agent-Optionen).

---

## User

für Opencode, Kimi funktionierte es nicht: milan@ADMINIS-JR0LN2L:/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main$ curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
🪨 caveman installer
  JuliusBrussee/caveman

→ Claude Code detected
  $ claude plugin marketplace add JuliusBrussee/caveman
Cloning via SSH: git@github.com:JuliusBrussee/caveman.git
Refreshing marketplace cache (timeout: 120s)…
Cloning repository (timeout: 120s): git@github.com:JuliusBrussee/caveman.git
Clone complete, validating marketplace…
Cleaning up old marketplace cache…
✔ Successfully added marketplace: caveman (declared in user settings)
  $ claude plugin install caveman@caveman
✔ Successfully installed plugin: caveman@caveman (scope: user)
  → installing hooks (--with-hooks)
  installed: /home/milan/.claude/hooks/package.json
  installed: /home/milan/.claude/hooks/caveman-config.js
  installed: /home/milan/.claude/hooks/caveman-activate.js
  installed: /home/milan/.claude/hooks/caveman-mode-tracker.js
  installed: /home/milan/.claude/hooks/caveman-stats.js
  installed: /home/milan/.claude/hooks/caveman-statusline.sh
  installed: /home/milan/.claude/hooks/caveman-statusline.ps1
  statusline badge configured.
  hooks wired in /home/milan/.claude/settings.json
  → wiring caveman-shrink MCP proxy (--with-mcp-shrink)
  $ claude mcp add caveman-shrink -- npx -y caveman-shrink
Added stdio MCP server caveman-shrink with command: npx -y caveman-shrink to local config
File modified: /home/milan/.claude.json [project: /mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main]
    registered. Wrap an upstream by editing the mcpServers entry — see:
    https://github.com/JuliusBrussee/caveman/tree/main/src/mcp-servers/caveman-shrink

→ Gemini CLI detected
  $ gemini extensions install https://github.com/JuliusBrussee/caveman
Do you want to continue? [Y/n]:
[ExtensionManager] Error loading agent from caveman: Failed to load agent from /home/milan/.gemini/extensions/caveman/agents/cavecrew-builder.md: Validation failed: Agent Definition:
tools.0: Invalid tool name
tools.1: Invalid tool name
tools.2: Invalid tool name
tools.3: Invalid tool name
tools.4: Invalid tool name
[ExtensionManager] Error loading agent from caveman: Failed to load agent from /home/milan/.gemini/extensions/caveman/agents/cavecrew-investigator.md: Validation failed: Agent Definition:
tools.0: Invalid tool name
tools.1: Invalid tool name
tools.2: Invalid tool name
tools.3: Invalid tool name
[ExtensionManager] Error loading agent from caveman: Failed to load agent from /home/milan/.gemini/extensions/caveman/agents/cavecrew-reviewer.md: Validation failed: Agent Definition:
tools.0: Invalid tool name
tools.1: Invalid tool name
tools.2: Invalid tool name

→ opencode detected
  installed: /home/milan/.config/opencode/plugins/caveman
  installed: /home/milan/.config/opencode/commands/caveman.md
  installed: /home/milan/.config/opencode/commands/caveman-commit.md
  installed: /home/milan/.config/opencode/commands/caveman-review.md
  opencode install failed: ENOENT: no such file or directory, copyfile '/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-compress.md' -> '/home/milan/.config/opencode/commands/caveman-compress.md'

→ Codex CLI detected
  $ npx -y skills add JuliusBrussee/caveman -a codex --yes --all

███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
███████║██║  ██╗██║███████╗███████╗███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝

┌   skills
│
│  Tip: use the --yes (-y) and --global (-g) flags to install without prompts.
│
◇  Source: https://github.com/JuliusBrussee/caveman.git
│
◇  Repository cloned
│
◇  Found 7 skills
│
●  Installing all 7 skills
│
●  Installing to all 71 agents

│
◇  Installation Summary ─────────────────────────────────────────────────────────╮
│                                                                                │
│  ./.agents/skills/cavecrew                                                     │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman                                                      │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: OpenClaw                                                        │
│                                                                                │
│  ./.agents/skills/caveman-commit                                               │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: OpenClaw                                                        │
│                                                                                │
│  ./.agents/skills/caveman-compress                                             │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: OpenClaw                                                        │
│                                                                                │
│  ./.agents/skills/caveman-help                                                 │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: OpenClaw                                                        │
│                                                                                │
│  ./.agents/skills/caveman-review                                               │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: OpenClaw                                                        │
│                                                                                │
│  ./.agents/skills/caveman-stats                                                │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: OpenClaw                                                        │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────╯
│
◇  Security Risk Assessments ───────────────────────────────────────╮
│                                                                   │
│                    Gen               Socket            Snyk       │
│  cavecrew          Safe              0 alerts          Low Risk   │
│  caveman           Safe              0 alerts          Low Risk   │
│  caveman-commit    Safe              0 alerts          Low Risk   │
│  caveman-compress  Safe              0 alerts          High Risk  │
│  caveman-help      Safe              0 alerts          Low Risk   │
│  caveman-review    Safe              0 alerts          Med Risk   │
│  caveman-stats     Safe              0 alerts          Low Risk   │
│                                                                   │
│  Details: https://skills.sh/JuliusBrussee/caveman                 │
│                                                                   │
├───────────────────────────────────────────────────────────────────╯
│
◇  Installation complete

│
◇  Installed 7 skills ────────────────────────────────────────────────────╮
│                                                                         │
│  ✓ ./.agents/skills/cavecrew                                            │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman                                             │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-commit                                      │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-compress                                    │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-help                                        │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-review                                      │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-stats                                       │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────╯

│
└  Done!  Review skills before use; they run with full agent permissions.


→ Qwen Code detected
  $ npx -y skills add JuliusBrussee/caveman -a qwen-code --yes --all

███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
███████║██║  ██╗██║███████╗███████╗███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝

┌   skills
│
│  Tip: use the --yes (-y) and --global (-g) flags to install without prompts.
│
◇  Source: https://github.com/JuliusBrussee/caveman.git
│
◇  Repository cloned
│
◇  Found 7 skills
│
●  Installing all 7 skills
│
●  Installing to all 71 agents

│
◇  Installation Summary ─────────────────────────────────────────────────────────╮
│                                                                                │
│  ./.agents/skills/cavecrew                                                     │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman                                                      │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman-commit                                               │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman-compress                                             │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman-help                                                 │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman-review                                               │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
│  ./.agents/skills/caveman-stats                                                │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more         │
│    symlink → AiderDesk, AstrBot, Autohand Code CLI, Augment, IBM Bob +47 more  │
│    overwrites: Amp, Antigravity, Antigravity CLI, OpenClaw, Cline +18 more     │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────╯
│
◇  Security Risk Assessments ───────────────────────────────────────╮
│                                                                   │
│                    Gen               Socket            Snyk       │
│  cavecrew          Safe              0 alerts          Low Risk   │
│  caveman           Safe              0 alerts          Low Risk   │
│  caveman-commit    Safe              0 alerts          Low Risk   │
│  caveman-compress  Safe              0 alerts          High Risk  │
│  caveman-help      Safe              0 alerts          Low Risk   │
│  caveman-review    Safe              0 alerts          Med Risk   │
│  caveman-stats     Safe              0 alerts          Low Risk   │
│                                                                   │
│  Details: https://skills.sh/JuliusBrussee/caveman                 │
│                                                                   │
├───────────────────────────────────────────────────────────────────╯
│
◇  Installation complete

│
◇  Installed 7 skills ────────────────────────────────────────────────────╮
│                                                                         │
│  ✓ ./.agents/skills/cavecrew                                            │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman                                             │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-commit                                      │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-compress                                    │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-help                                        │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-review                                      │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│  ✓ ./.agents/skills/caveman-stats                                       │
│    universal: Amp, Antigravity, Antigravity CLI, Cline, Codex +14 more  │
│    symlinked: OpenClaw, Junie, Kiro CLI, Roo Code                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────╯

│
└  Done!  Review skills before use; they run with full agent permissions.


  tip: re-run inside a repo with --all (or --with-init) to also write per-repo
       Cursor/Windsurf/Cline/Copilot/AGENTS.md rule files.

🪨 done
  installed:
    • claude
    • claude-hooks
    • caveman-shrink
    • gemini
    • codex
    • qwen
  failed:
    • opencode — ENOENT: no such file or directory, copyfile '/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-compress.md' -> '/home/milan/.config/opencode/commands/caveman-compress.md'

  start any session and say 'caveman mode', or run /caveman in Claude Code
  uninstall: npx -y github:JuliusBrussee/caveman -- --uninstall
milan@ADMINIS-JR0LN2L:/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main$ 

---

## Assistant (Plan · MiMo V2.5 Free · 5.4s)

_Thinking:_

The user ran the installer and got an error for opencode:

```
failed:
    • opencode — ENOENT: no such file or directory, copyfile '/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-compress.md' -> '/home/milan/.config/opencode/commands/caveman-compress.md'
```

So the issue is that `caveman-compress.md` doesn't exist at the expected source path. Let me check what files exist in the opencode plugin directory.

Ich sehe das Problem – der Installer konnte `caveman-compress.md` nicht finden. Lass mich prüfen, welche Dateien tatsächlich vorhanden sind.

**Tool: glob**

**Input:**
```json
{
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode",
  "pattern": "**/*"
}
```

**Output:**
```
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/package.json
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/plugin.js
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/README.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-review.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-help.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-commit.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-stats.md
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman.md
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js",
  "limit": 100
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js</path>
<type>file</type>
<content>
1: #!/usr/bin/env node
2: // caveman — unified cross-platform installer.
3: //
4: // One Node script replaces the old install.sh + install.ps1 + src/hooks/install.sh
5: // + src/hooks/install.ps1 quartet. Single source of truth. Works on macOS, Linux,
6: // and Windows (PowerShell or cmd) without any of the bash/PS1 quoting bugs
7: // that previously broke the JSON merge step (issue #249).
8: //
9: // Distribution:
10: //   Local clone: node bin/install.js [flags]
11: //   curl|bash:   delegated from install.sh shim → npx -y github:JuliusBrussee/caveman -- [flags]
12: //   Windows:     pwsh install.ps1 [flags] → same npx delegation
13: //
14: // Pure stdlib, zero npm runtime deps.
15: 
16: 'use strict';
17: 
18: const fs = require('fs');
19: const os = require('os');
20: const path = require('path');
21: const child_process = require('child_process');
22: const readline = require('readline');
23: 
24: const SETTINGS = require('./lib/settings');
25: const OPENCLAW = require('./lib/openclaw');
26: 
27: const REPO = 'JuliusBrussee/caveman';
28: const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/main`;
29: const HOOKS_REMOTE = `${RAW_BASE}/src/hooks`;
30: const INIT_SCRIPT_URL = `${RAW_BASE}/src/tools/caveman-init.js`;
31: const MCP_SHRINK_PKG = 'caveman-shrink';
32: // Hook files to copy. Statusline ships in both .sh (macOS/Linux) and .ps1
33: // (Windows) flavors — copy both regardless of host OS so a roaming
34: // $CLAUDE_CONFIG_DIR (e.g. dotfiles repo) keeps working across platforms.
35: const HOOK_FILES = [
36:   'package.json',
37:   'caveman-config.js',
38:   'caveman-activate.js',
39:   'caveman-mode-tracker.js',
40:   'caveman-stats.js',
41:   'caveman-statusline.sh',
42:   'caveman-statusline.ps1',
43: ];
44: 
45: // ── Argv ───────────────────────────────────────────────────────────────────
46: function parseArgs(argv) {
47:   const opts = {
48:     dryRun: false, force: false, skipSkills: false,
49:     withHooks: 'auto', withInit: false, withMcpShrink: 'auto',
50:     all: false, minimal: false, listOnly: false, noColor: false,
51:     only: [], uninstall: false, nonInteractive: false,
52:     configDir: null, help: false,
53:   };
54:   for (let i = 0; i < argv.length; i++) {
55:     const a = argv[i];
56:     switch (a) {
57:       case '--dry-run': opts.dryRun = true; break;
58:       case '--force': opts.force = true; break;
59:       case '--skip-skills': opts.skipSkills = true; break;
60:       case '--with-hooks': opts.withHooks = true; break;
61:       case '--no-hooks': opts.withHooks = false; break;
62:       case '--with-init': opts.withInit = true; break;
63:       case '--with-mcp-shrink': opts.withMcpShrink = true; break;
64:       case '--no-mcp-shrink': opts.withMcpShrink = false; break;
65:       case '--all': opts.all = true; break;
66:       case '--minimal': opts.minimal = true; break;
67:       case '--list': opts.listOnly = true; break;
68:       case '--no-color': opts.noColor = true; break;
69:       case '--uninstall': case '-u': opts.uninstall = true; break;
70:       case '--non-interactive': opts.nonInteractive = true; break;
71:       case '-h': case '--help': opts.help = true; break;
72:       // POSIX end-of-options marker. Older curl|bash flows pipe `-- --only foo`
73:       // through npx; some npx versions forward the literal `--`. Accept and
74:       // ignore so we never regress on the headline install command.
75:       case '--': break;
76:       case '--only': {
77:         const v = argv[++i];
78:         if (!v) die('error: --only requires an argument');
79:         opts.only.push(v === 'aider' ? 'aider-desk' : v);
80:         break;
81:       }
82:       case '--config-dir': {
83:         const v = argv[++i];
84:         if (!v || v.startsWith('--')) die('error: --config-dir requires a path');
85:         opts.configDir = expandHome(v);
86:         break;
87:       }
88:       default:
89:         die(`error: unknown flag: ${a}\nrun 'caveman --help' for usage`);
90:     }
91:   }
92:   if (opts.all && opts.minimal) die('error: --all and --minimal are mutually exclusive');
93:   if (opts.all) { opts.withHooks = true; opts.withInit = true; opts.withMcpShrink = true; }
94:   if (opts.minimal) { opts.withHooks = false; opts.withInit = false; opts.withMcpShrink = false; }
95:   if (opts.withHooks === 'auto') opts.withHooks = true;
96:   if (opts.withMcpShrink === 'auto') opts.withMcpShrink = true;
97:   // Validate --only ids against the provider matrix. PROVIDERS is defined later
98:   // in the file but is in scope by the time this function runs.
99:   if (opts.only.length) {
100:     const knownIds = new Set(PROVIDERS.map(p => p.id));

(Showing lines 1-100 of 1221. Use offset=101 to continue.)
</content>
```

---

## Assistant (Plan · MiMo V2.5 Free · 5.7s)

_Thinking:_

I see the issue. The installer is trying to copy `caveman-compress.md` from `src/plugins/opencode/commands/` but that file doesn't exist there. Looking at the glob results, the file exists at `skills/caveman-compress/` but not in the opencode commands directory.

Let me look at the installer code to find where this copy happens for opencode.

**Tool: grep**

**Input:**
```json
{
  "pattern": "caveman-compress",
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js"
}
```

**Output:**
```
Found 2 matches
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js:
  Line 465: const OPENCODE_SKILL_DIRS  = ['caveman', 'caveman-commit', 'caveman-review', 'caveman-help', 'caveman-stats', 'caveman-compress', 'cavecrew'];

  Line 467: const OPENCODE_COMMAND_FILES = ['caveman.md', 'caveman-commit.md', 'caveman-review.md', 'caveman-compress.md', 'caveman-stats.md', 'caveman-help.md'];

```

**Tool: grep**

**Input:**
```json
{
  "pattern": "opencode",
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js"
}
```

**Output:**
```
Found 41 matches
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js:
  Line 164:   { id: 'opencode',   label: 'opencode',            mech: 'native opencode plugin',        detect: 'command:opencode' },

  Line 459: // ── opencode native install ───────────────────────────────────────────────

  Line 460: // Drops the in-repo plugin (src/plugins/opencode/) plus skills, agents,

  Line 461: // commands, and an AGENTS.md ruleset into ~/.config/opencode/. Patches

  Line 462: // opencode.json with a "plugin" array entry. Mirrors the Claude Code hook

  Line 463: // architecture as closely as opencode allows — only the statusline is missing

  Line 464: // (opencode's TUI exposes no plugin-writable badge).

  Line 470: // Marker fence for the opencode AGENTS.md ruleset block. Same convention as

  Line 476: function opencodeConfigDir() {

  Line 477:   if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'opencode');

  Line 478:   if (IS_WIN) return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'opencode');

  Line 479:   return path.join(os.homedir(), '.config', 'opencode');

  Line 495:   say('→ opencode detected');

  Line 498:     warn('  opencode native install requires a local clone of the caveman repo.');

  Line 499:     note('  Re-run from a clone: git clone https://github.com/' + REPO + ' && cd caveman && node bin/install.js --only opencode');

  Line 500:     results.failed.push(['opencode', 'native install requires local repo clone']);

  Line 505:   const dir = opencodeConfigDir();

  Line 510:   const opencodeJson = path.join(dir, 'opencode.json');

  Line 519:     note(`  would patch ${opencodeJson} with "plugin" entry${opts.withMcpShrink ? ' + caveman-shrink MCP' : ''}`);

  Line 521:     results.installed.push('opencode');

  Line 531:     const pluginSrc = path.join(repoRoot, 'src', 'plugins', 'opencode');

  Line 572:     // 4. Skills — opencode auto-discovers SKILL.md from ~/.config/opencode/skills/.

  Line 617:     // 6. opencode.json — add plugin entry; optional caveman-shrink MCP.

  Line 618:     let cfg = SETTINGS.readSettings(opencodeJson);

  Line 620:       warn(`  ${opencodeJson} unparseable; will not touch it. Edit manually then re-run.`);

  Line 621:       results.failed.push(['opencode', 'opencode.json unparseable']);

  Line 627:     const opencodeBak = opencodeJson + '.bak';

  Line 628:     if (fs.existsSync(opencodeJson) && !fs.existsSync(opencodeBak)) {

  Line 629:       try { fs.copyFileSync(opencodeJson, opencodeBak); } catch (_) {}

  Line 646:     SETTINGS.writeSettings(opencodeJson, cfg);

  Line 647:     process.stdout.write(`  patched: ${opencodeJson}\n`);

  Line 649:     results.installed.push('opencode');

  Line 651:     warn('  opencode install failed: ' + (e && e.message || e));

  Line 652:     results.failed.push(['opencode', (e && e.message) || 'unknown error']);

  Line 932:   // opencode native install — strip plugin entry, MCP entry, and our files.

  Line 934:   const ocDir = opencodeConfigDir();

  Line 937:     const ocJson = path.join(ocDir, 'opencode.json');

  Line 1001:     // opencode flag file

  Line 1092:                         install\`, opencode (XDG_CONFIG_HOME), or openclaw

  Line 1159:     // bail itself if its preconditions aren't met (e.g. opencode bails when

  Line 1165:     if (prov.id === 'opencode') { installOpencode(ctx); continue; }

```

---

## Assistant (Plan · MiMo V2.5 Free · 2.7s)

_Thinking:_

I see the issue now. The installer expects `caveman-compress.md` to exist in `src/plugins/opencode/commands/` but it doesn't. Let me look at what files exist in that directory and what the install script is trying to copy.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js",
  "offset": 530,
  "limit": 100
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js</path>
<type>file</type>
<content>
530:     fs.mkdirSync(pluginDir, { recursive: true });
531:     const pluginSrc = path.join(repoRoot, 'src', 'plugins', 'opencode');
532:     const pluginPayload = [
533:       [path.join(pluginSrc, 'plugin.js'),    path.join(pluginDir, 'plugin.js')],
534:       [path.join(pluginSrc, 'package.json'), path.join(pluginDir, 'package.json')],
535:       // Renamed to .cjs because the plugin dir is "type": "module" — a bare .js
536:       // sibling would be loaded as ESM and break the plugin's require() bridge.
537:       [path.join(repoRoot, 'src', 'hooks', 'caveman-config.js'),
538:        path.join(pluginDir, 'caveman-config.cjs')],
539:     ];
540:     for (const [src, dest] of pluginPayload) {
541:       if (fs.existsSync(dest) && !opts.force) {
542:         note(`  skipped ${dest} (exists; --force to overwrite)`);
543:         continue;
544:       }
545:       fs.copyFileSync(src, dest);
546:     }
547:     process.stdout.write(`  installed: ${pluginDir}\n`);
548: 
549:     // 2. Commands.
550:     fs.mkdirSync(commandsDir, { recursive: true });
551:     const cmdSrcDir = path.join(pluginSrc, 'commands');
552:     for (const f of OPENCODE_COMMAND_FILES) {
553:       const src = path.join(cmdSrcDir, f);
554:       const dest = path.join(commandsDir, f);
555:       if (fs.existsSync(dest) && !opts.force) { note(`  skipped ${dest} (exists; --force to overwrite)`); continue; }
556:       fs.copyFileSync(src, dest);
557:       process.stdout.write(`  installed: ${dest}\n`);
558:     }
559: 
560:     // 3. Subagents.
561:     fs.mkdirSync(agentsDir, { recursive: true });
562:     const agentSrcDir = path.join(repoRoot, 'agents');
563:     for (const f of OPENCODE_AGENT_FILES) {
564:       const src = path.join(agentSrcDir, f);
565:       const dest = path.join(agentsDir, f);
566:       if (!fs.existsSync(src)) continue;
567:       if (fs.existsSync(dest) && !opts.force) { note(`  skipped ${dest} (exists; --force to overwrite)`); continue; }
568:       fs.copyFileSync(src, dest);
569:       process.stdout.write(`  installed: ${dest}\n`);
570:     }
571: 
572:     // 4. Skills — opencode auto-discovers SKILL.md from ~/.config/opencode/skills/.
573:     fs.mkdirSync(skillsDir, { recursive: true });
574:     const skillSrcDir = path.join(repoRoot, 'skills');
575:     for (const name of OPENCODE_SKILL_DIRS) {
576:       const src = path.join(skillSrcDir, name);
577:       const dest = path.join(skillsDir, name);
578:       if (!fs.existsSync(src)) continue;
579:       if (fs.existsSync(dest) && !opts.force) { note(`  skipped ${dest}/ (exists; --force to overwrite)`); continue; }
580:       copyDirRecursive(src, dest);
581:       process.stdout.write(`  installed: ${dest}/\n`);
582:     }
583: 
584:     // 5. AGENTS.md — Tier-3 always-on ruleset. Wrapped in begin/end markers so
585:     //    a later --uninstall can strip our block cleanly even if the user has
586:     //    authored content above AND below it. Idempotency check uses the begin
587:     //    marker (the legacy sentinel still matches old installs).
588:     const ruleBody = fs.readFileSync(path.join(repoRoot, 'src', 'rules', 'caveman-activate.md'), 'utf8').trimEnd() + '\n';
589:     const fencedBlock = `${OPENCODE_AGENTS_MD_BEGIN}\n${ruleBody}${OPENCODE_AGENTS_MD_END}\n`;
590:     if (fs.existsSync(agentsMd)) {
591:       const existing = fs.readFileSync(agentsMd, 'utf8');
592:       const alreadyFenced = existing.includes(OPENCODE_AGENTS_MD_BEGIN)
593:         && existing.includes(OPENCODE_AGENTS_MD_END);
594:       const alreadyByLegacySentinel = !alreadyFenced && existing.includes(OPENCODE_AGENTS_MD_SENTINEL);
595:       if (alreadyFenced) {
596:         note(`  ${agentsMd} already contains caveman ruleset`);
597:       } else if (alreadyByLegacySentinel) {
598:         note(`  ${agentsMd} contains a legacy (un-fenced) caveman block — leaving as-is`);
599:         note('  re-run with --force to replace it with a fenced block');
600:         if (opts.force) {
601:           // Replace the entire file with a clean fenced version. The legacy
602:           // path didn't fence, so we can't isolate the block — full rewrite is
603:           // the only safe option under --force.
604:           fs.writeFileSync(agentsMd, fencedBlock, { mode: 0o644 });
605:           process.stdout.write(`  rewrote ${agentsMd} with fenced caveman block\n`);
606:         }
607:       } else {
608:         const sep = existing.endsWith('\n\n') ? '' : (existing.endsWith('\n') ? '\n' : '\n\n');
609:         fs.writeFileSync(agentsMd, existing + sep + fencedBlock, { mode: 0o644 });
610:         process.stdout.write(`  appended caveman ruleset to ${agentsMd}\n`);
611:       }
612:     } else {
613:       fs.writeFileSync(agentsMd, fencedBlock, { mode: 0o644 });
614:       process.stdout.write(`  installed: ${agentsMd}\n`);
615:     }
616: 
617:     // 6. opencode.json — add plugin entry; optional caveman-shrink MCP.
618:     let cfg = SETTINGS.readSettings(opencodeJson);
619:     if (cfg === null) {
620:       warn(`  ${opencodeJson} unparseable; will not touch it. Edit manually then re-run.`);
621:       results.failed.push(['opencode', 'opencode.json unparseable']);
622:       process.stdout.write('\n');
623:       return;
624:     }
625:     // Preserve the original on first install only — repeat installs would
626:     // otherwise overwrite the only known-good copy with an already-merged file.
627:     const opencodeBak = opencodeJson + '.bak';
628:     if (fs.existsSync(opencodeJson) && !fs.existsSync(opencodeBak)) {
629:       try { fs.copyFileSync(opencodeJson, opencodeBak); } catch (_) {}

(Showing lines 530-629 of 1221. Use offset=630 to continue.)
</content>
```

---

## Assistant (Plan · MiMo V2.5 Free · 3.6s)

_Thinking:_

Now I understand the issue. The installer at line 552-558 tries to copy files from `OPENCODE_COMMAND_FILES` which includes `caveman-compress.md`, but that file doesn't exist in `src/plugins/opencode/commands/`.

The existing files in that directory are:
- caveman.md
- caveman-commit.md
- caveman-review.md
- caveman-help.md
- caveman-stats.md

But `caveman-compress.md` is missing.

Looking at the code, the skills directory has `caveman-compress/SKILL.md` which should handle the compression functionality, but the command file is missing from the opencode plugin.


I need to trace back to where the command file is being referenced and understand why it's not being copied properly.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js",
  "limit": 10,
  "offset": 465
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js</path>
<type>file</type>
<content>
465: const OPENCODE_SKILL_DIRS  = ['caveman', 'caveman-commit', 'caveman-review', 'caveman-help', 'caveman-stats', 'caveman-compress', 'cavecrew'];
466: const OPENCODE_AGENT_FILES = ['cavecrew-investigator.md', 'cavecrew-builder.md', 'cavecrew-reviewer.md'];
467: const OPENCODE_COMMAND_FILES = ['caveman.md', 'caveman-commit.md', 'caveman-review.md', 'caveman-compress.md', 'caveman-stats.md', 'caveman-help.md'];
468: const OPENCODE_PLUGIN_REL = './plugins/caveman/plugin.js';
469: const OPENCODE_AGENTS_MD_SENTINEL = 'Respond terse like smart caveman';
470: // Marker fence for the opencode AGENTS.md ruleset block. Same convention as
471: // bin/lib/openclaw.js for SOUL.md — lets us strip our block cleanly even when
472: // the user has authored content above AND below it.
473: const OPENCODE_AGENTS_MD_BEGIN = '<!-- caveman-begin -->';
474: const OPENCODE_AGENTS_MD_END = '<!-- caveman-end -->';

(Showing lines 465-474 of 1221. Use offset=475 to continue.)
</content>
```

---

## Assistant (Plan · MiMo V2.5 Free · 6.0s)

_Thinking:_

Now I understand the problem clearly. The installer is trying to copy `caveman-compress.md` from `src/plugins/opencode/commands/` but that file doesn't exist. The file `caveman-compress.md` is only in the `skills/caveman-compress/` directory as `SKILL.md`.

Looking at the available files:
- `src/plugins/opencode/commands/caveman.md` ✓
- `src/plugins/opencode/commands/caveman-commit.md` ✓
- `src/plugins/opencode/commands/caveman-review.md` ✓
- `src/plugins/opencode/commands/caveman-help.md` ✓
- `src/plugins/opencode/commands/caveman-stats.md` ✓
- `src/plugins/opencode/commands/caveman-compress.md` ✗ MISSING

The installer expects this file but it's not there. The solution is either:
1. Create the missing `caveman-compress.md` command file
2. Remove `caveman-compress.md` from the `OPENCODE_COMMAND_FILES` array

Since we're in plan mode, I should present this as a plan to the user.

Das Problem ist klar: Der Installer erwartet `caveman-compress.md` in `src/plugins/opencode/commands/`, aber diese Datei existiert nicht.

Vorhandene Dateien:
- `caveman.md`, `caveman-commit.md`, `caveman-review.md`, `caveman-help.md`, `caveman-stats.md` ✓

Fehlende Datei:
- `caveman-compress.md` ✗

## Optionen

1. **Fehlende Datei erstellen** – `caveman-compress.md` im selben Stil wie die anderen Commands anlegen (kopiert den Skill-Inhalt als opencode-kompatibles Command-Format)
2. **Aus Installer entfernen** – `'caveman-compress.md'` aus `OPENCODE_COMMAND_FILES` in `bin/install.js:467` streichen

Welche Lösung bevorzugst du? Oder soll ich beides machen – Datei erstellen UND Installer korrigieren?

---

## User

kannst du das machen? 

---

## Assistant (Build · MiMo V2.5 Free · 3.2s)

_Thinking:_

The user wants me to fix the issue. Let me first look at an existing command file to understand the format, then create the missing `caveman-compress.md` file.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman.md"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman.md</path>
<type>file</type>
<content>
1: ---
2: description: Activate caveman compression mode (lite | full | ultra | wenyan | off)
3: ---
4: Activate caveman mode: $ARGUMENTS
5: 
6: If no level given, use full. If "off", deactivate.
7: 
8: Respond terse like smart caveman. Drop articles, filler, pleasantries, hedging.
9: Fragments OK. Technical terms exact. Code unchanged.
10: Pattern: [thing] [action] [reason]. [next step].
11: 
12: Behavior persists until session ends or user says "stop caveman" / "normal mode".
13: Code, commits, security warnings: write normal English.

(End of file - total 13 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-compress/SKILL.md"
}
```

**Output:**
```
<path>/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/skills/caveman-compress/SKILL.md</path>
<type>file</type>
<content>
1: ---
2: name: caveman-compress
3: description: >
4:   Compress natural language memory files (CLAUDE.md, todos, preferences) into caveman format
5:   to save input tokens. Preserves all technical substance, code, URLs, and structure.
6:   Compressed version overwrites the original file. Human-readable backup saved as FILE.original.md.
7:   Trigger: /caveman-compress FILEPATH or "compress memory file"
8: ---
9: 
10: # Caveman Compress
11: 
12: ## Purpose
13: 
14: Compress natural language files (CLAUDE.md, todos, preferences) into caveman-speak to reduce input tokens. Compressed version overwrites original. Human-readable backup saved as `<filename>.original.md`.
15: 
16: ## Trigger
17: 
18: `/caveman-compress <filepath>` or when user asks to compress a memory file.
19: 
20: ## Process
21: 
22: 1. The compression scripts live in `scripts/` (adjacent to this SKILL.md). If the path is not immediately available, search for `scripts/__main__.py` next to this SKILL.md.
23: 
24: 2. From the directory containing this SKILL.md, run:
25: 
26: python3 -m scripts <absolute_filepath>
27: 
28: 3. The CLI will:
29: - detect file type (no tokens)
30: - call Claude to compress
31: - validate output (no tokens)
32: - if errors: cherry-pick fix with Claude (targeted fixes only, no recompression)
33: - retry up to 2 times
34: - if still failing after 2 retries: report error to user, leave original file untouched
35: 
36: 4. Return result to user
37: 
38: ## Compression Rules
39: 
40: ### Remove
41: - Articles: a, an, the
42: - Filler: just, really, basically, actually, simply, essentially, generally
43: - Pleasantries: "sure", "certainly", "of course", "happy to", "I'd recommend"
44: - Hedging: "it might be worth", "you could consider", "it would be good to"
45: - Redundant phrasing: "in order to" → "to", "make sure to" → "ensure", "the reason is because" → "because"
46: - Connective fluff: "however", "furthermore", "additionally", "in addition"
47: 
48: ### Preserve EXACTLY (never modify)
49: - Code blocks (fenced ``` and indented)
50: - Inline code (`backtick content`)
51: - URLs and links (full URLs, markdown links)
52: - File paths (`/src/components/...`, `./config.yaml`)
53: - Commands (`npm install`, `git commit`, `docker build`)
54: - Technical terms (library names, API names, protocols, algorithms)
55: - Proper nouns (project names, people, companies)
56: - Dates, version numbers, numeric values
57: - Environment variables (`$HOME`, `NODE_ENV`)
58: 
59: ### Preserve Structure
60: - All markdown headings (keep exact heading text, compress body below)
61: - Bullet point hierarchy (keep nesting level)
62: - Numbered lists (keep numbering)
63: - Tables (compress cell text, keep structure)
64: - Frontmatter/YAML headers in markdown files
65: 
66: ### Compress
67: - Use short synonyms: "big" not "extensive", "fix" not "implement a solution for", "use" not "utilize"
68: - Fragments OK: "Run tests before commit" not "You should always run tests before committing"
69: - Drop "you should", "make sure to", "remember to" — just state the action
70: - Merge redundant bullets that say the same thing differently
71: - Keep one example where multiple examples show the same pattern
72: 
73: CRITICAL RULE:
74: Anything inside ``` ... ``` must be copied EXACTLY.
75: Do not:
76: - remove comments
77: - remove spacing
78: - reorder lines
79: - shorten commands
80: - simplify anything
81: 
82: Inline code (`...`) must be preserved EXACTLY.
83: Do not modify anything inside backticks.
84: 
85: If file contains code blocks:
86: - Treat code blocks as read-only regions
87: - Only compress text outside them
88: - Do not merge sections around code
89: 
90: ## Pattern
91: 
92: Original:
93: > You should always make sure to run the test suite before pushing any changes to the main branch. This is important because it helps catch bugs early and prevents broken builds from being deployed to production.
94: 
95: Compressed:
96: > Run tests before push to main. Catch bugs early, prevent broken prod deploys.
97: 
98: Original:
99: > The application uses a microservices architecture with the following components. The API gateway handles all incoming requests and routes them to the appropriate service. The authentication service is responsible for managing user sessions and JWT tokens.
100: 
101: Compressed:
102: > Microservices architecture. API gateway route all requests to services. Auth service manage user sessions + JWT tokens.
103: 
104: ## Boundaries
105: 
106: - ONLY compress natural language files (.md, .txt, .typ, .typst, .tex, extensionless)
107: - NEVER modify: .py, .js, .ts, .json, .yaml, .yml, .toml, .env, .lock, .css, .html, .xml, .sql, .sh
108: - If file has mixed content (prose + code), compress ONLY the prose sections
109: - If unsure whether something is code or prose, leave it unchanged
110: - Original file is backed up as FILE.original.md before overwriting
111: - Never compress FILE.original.md (skip it)

(End of file - total 111 lines)
</content>
```

---

## Assistant (Build · MiMo V2.5 Free · 6.6s)

_Thinking:_

Now I understand the format. Let me create the missing `caveman-compress.md` command file. I'll model it after the other command files but adapted for the compress functionality.

**Tool: write**

**Input:**
```json
{
  "filePath": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/src/plugins/opencode/commands/caveman-compress.md",
  "content": "---\ndescription: Compress a memory file (CLAUDE.md, todos, preferences) into caveman format to save input tokens\n---\nCompress file: $ARGUMENTS\n\nIf no file given, ask which file to compress.\nFile must be .md, .txt, or natural language — never .py, .js, .json, .yaml, .lock, etc.\n\nBefore compressing, backup original to FILE.original.md.\nThen rewrite file into caveman-speak: drop articles, filler, pleasantries, hedging.\nFragments OK. Keep all code blocks, URLs, paths, commands, technical terms EXACTLY as-is.\nPreserve markdown structure (headings, lists, tables).\n\nReport: original size → compressed size → tokens saved.\n"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiMo V2.5 Free · 3.9s)

_Thinking:_

Now let me verify the file was created and then check if there are any other issues. Let me also look at the skills directory to make sure it exists.

Fertig. Die Datei `src/plugins/opencode/commands/caveman-compress.md` wurde erstellt.

Danach einfach nochmal installieren:

```bash
node bin/install.js --only opencode --force
```

Oder den kompletten Installer nochmal laufen lassen – der sollte opencode jetzt erfolgreich installieren.

---

## User

und kimi code geht GAR nicht? 

---

## Assistant (Build · MiMo V2.5 Free · 6.2s)

_Thinking:_

The user is asking about Kimi Code - why it doesn't work at all with caveman. Let me check the installer to see if Kimi Code is even supported as a provider.

**Tool: grep**

**Input:**
```json
{
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js",
  "pattern": "kimi|Kimi"
}
```

**Output:**
```
No files found
```

**Tool: grep**

**Input:**
```json
{
  "path": "/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js",
  "pattern": "id:.*'"
}
```

**Output:**
```
Found 34 matches
/mnt/c/Users/Administrator/Desktop/caveman-main/caveman-main/bin/install.js:
  Line 162:   { id: 'claude',     label: 'Claude Code',         mech: 'claude plugin install',         detect: 'command:claude' },

  Line 163:   { id: 'gemini',     label: 'Gemini CLI',          mech: 'gemini extensions install',     detect: 'command:gemini' },

  Line 164:   { id: 'opencode',   label: 'opencode',            mech: 'native opencode plugin',        detect: 'command:opencode' },

  Line 165:   { id: 'openclaw',   label: 'OpenClaw',            mech: 'workspace skill + SOUL.md',     detect: 'command:openclaw||dir:$HOME/.openclaw/workspace' },

  Line 166:   { id: 'codex',      label: 'Codex CLI',           mech: 'npx skills add (codex)',        detect: 'command:codex',           profile: 'codex' },

  Line 171:   { id: 'cursor',     label: 'Cursor',              mech: 'npx skills add (cursor)',       detect: 'command:cursor||macapp:Cursor', profile: 'cursor' },

  Line 172:   { id: 'windsurf',   label: 'Windsurf',            mech: 'npx skills add (windsurf)',     detect: 'command:windsurf||macapp:Windsurf', profile: 'windsurf' },

  Line 173:   { id: 'cline',      label: 'Cline',               mech: 'npx skills add (cline)',        detect: 'vscode-ext:cline',        profile: 'cline' },

  Line 174:   { id: 'continue',   label: 'Continue',            mech: 'npx skills add (continue)',     detect: 'vscode-ext:continue.continue||vscode-ext:continue', profile: 'continue' },

  Line 175:   { id: 'kilo',       label: 'Kilo Code',           mech: 'npx skills add (kilo)',         detect: 'vscode-ext:kilocode', profile: 'kilo' },

  Line 176:   { id: 'roo',        label: 'Roo Code',            mech: 'npx skills add (roo)',          detect: 'vscode-ext:roo||vscode-ext:rooveterinaryinc.roo-cline||cursor-ext:roo', profile: 'roo' },

  Line 177:   { id: 'augment',    label: 'Augment Code',        mech: 'npx skills add (augment)',      detect: 'vscode-ext:augment||jetbrains-plugin:augment', profile: 'augment' },

  Line 182:   { id: 'copilot',    label: 'GitHub Copilot',      mech: 'npx skills add (github-copilot)', detect: 'command:copilot', profile: 'github-copilot', soft: true },

  Line 187:   { id: 'aider-desk', label: 'Aider Desk',          mech: 'npx skills add (aider-desk)',   detect: 'command:aider', profile: 'aider-desk' },

  Line 188:   { id: 'amp',        label: 'Sourcegraph Amp',     mech: 'npx skills add (amp)',          detect: 'command:amp',             profile: 'amp' },

  Line 189:   { id: 'bob',        label: 'IBM Bob',             mech: 'npx skills add (bob)',          detect: 'command:bob', profile: 'bob' },

  Line 190:   { id: 'crush',      label: 'Crush',               mech: 'npx skills add (crush)',        detect: 'command:crush', profile: 'crush' },

  Line 191:   { id: 'devin',      label: 'Devin (terminal)',    mech: 'npx skills add (devin)',        detect: 'command:devin', profile: 'devin' },

  Line 192:   { id: 'droid',      label: 'Droid (Factory)',     mech: 'npx skills add (droid)',        detect: 'command:droid', profile: 'droid' },

  Line 193:   { id: 'forgecode',  label: 'ForgeCode',           mech: 'npx skills add (forgecode)',    detect: 'command:forge', profile: 'forgecode' },

  Line 194:   { id: 'goose',      label: 'Block Goose',         mech: 'npx skills add (goose)',        detect: 'command:goose', profile: 'goose' },

  Line 195:   { id: 'iflow',      label: 'iFlow CLI',           mech: 'npx skills add (iflow-cli)',    detect: 'command:iflow', profile: 'iflow-cli' },

  Line 196:   { id: 'kiro',       label: 'Kiro CLI',            mech: 'npx skills add (kiro-cli)',     detect: 'command:kiro', profile: 'kiro-cli' },

  Line 197:   { id: 'mistral',    label: 'Mistral Vibe',        mech: 'npx skills add (mistral-vibe)', detect: 'command:mistral', profile: 'mistral-vibe' },

  Line 198:   { id: 'openhands',  label: 'OpenHands',           mech: 'npx skills add (openhands)',    detect: 'command:openhands', profile: 'openhands' },

  Line 199:   { id: 'qwen',       label: 'Qwen Code',           mech: 'npx skills add (qwen-code)',    detect: 'command:qwen', profile: 'qwen-code' },

  Line 200:   { id: 'rovodev',    label: 'Atlassian Rovo Dev',  mech: 'npx skills add (rovodev)',      detect: 'command:rovodev', profile: 'rovodev' },

  Line 201:   { id: 'tabnine',    label: 'Tabnine CLI',         mech: 'npx skills add (tabnine-cli)',  detect: 'command:tabnine', profile: 'tabnine-cli' },

  Line 202:   { id: 'trae',       label: 'Trae',                mech: 'npx skills add (trae)',         detect: 'command:trae', profile: 'trae' },

  Line 203:   { id: 'warp',       label: 'Warp',                mech: 'npx skills add (warp)',         detect: 'command:warp', profile: 'warp' },

  Line 204:   { id: 'replit',     label: 'Replit Agent',        mech: 'npx skills add (replit)',       detect: 'command:replit', profile: 'replit' },

  Line 212:   { id: 'junie',      label: 'JetBrains Junie',     mech: 'npx skills add (junie)',        detect: 'jetbrains-plugin:junie', profile: 'junie', soft: true },

  Line 213:   { id: 'qoder',      label: 'Qoder',               mech: 'npx skills add (qoder)',        detect: 'dir:$HOME/.qoder', profile: 'qoder', soft: true },

  Line 214:   { id: 'antigravity',label: 'Google Antigravity',  mech: 'npx skills add (antigravity)',  detect: 'dir:$HOME/.gemini/antigravity', profile: 'antigravity', soft: true },

```

---

## Assistant (Build · MiMo V2.5 Free · 7.0s)

_Thinking:_

Kimi Code is not in the list of supported providers. The installer supports 30+ agents but Kimi is not one of them. The user would need to manually add caveman skills to Kimi Code if it supports skills/extensions. Let me check if there's any mention of Kimi in the README or if it supports a similar mechanism.

Kimi Code ist im Installer **nicht als Provider hinterlegt**. Das Projekt unterstützt 30+ Agenten, aber Kimi fehlt komplett.

Das heißt: Kein Auto-Detect, kein `--only kimi`, kein eigener Install-Pfad.

**Manueller Workaround** – wenn Kimi Skills/Extensions unterstützt:

```bash
# Skills manuell ins Kimi-Verzeichnis kopieren
cp -r skills/caveman ~/.kimi/skills/
cp -r skills/caveman-commit ~/.kimi/skills/
# etc.
```

Oder du prüfst erst, ob Kimi überhaupt ein Skill-System hat. Ohne das gibt es keinen Weg, caveman dort einzubinden.

Soll ich im Installer eine Kimi-Provider-Zeile ergänzen (Zeile ~214)? Dafür müsste ich wissen, wie Kimi Skills lädt – hast du davon Ahnung oder soll ich nachschauen?

---

