/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text, react-hooks/exhaustive-deps */
"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  CirclePlus,
  Clock3,
  House,
  Menu,
  RotateCcw,
  Settings2,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  db,
  subjects,
  reasons,
  uid,
  localDay,
  addDays,
  status,
  saveMistake,
  deleteMistake,
  recordReview,
  reviewNextDate,
  compressImage,
  exportBackup,
  importBackup,
  loadDemo,
  clearDemo,
  syncRewards,
  type Mistake,
  type Photo,
  type Review,
  type Result,
  type Subject,
  type Reason,
} from "@/lib/db";
import {
  homeSuggestions,
  repeatedWrong,
  todayTaskProgress,
  topTopics,
  weekComparison,
  weekStart,
} from "@/lib/insights";
type Page =
  | "首页"
  | "添加错题"
  | "错题本"
  | "复习挑战"
  | "错题分析"
  | "家长报告"
  | "设置";
const pages: { name: Page; icon: typeof House }[] = [
  { name: "首页", icon: House },
  { name: "添加错题", icon: CirclePlus },
  { name: "错题本", icon: BookOpen },
  { name: "复习挑战", icon: RotateCcw },
  { name: "错题分析", icon: ChartNoAxesCombined },
  { name: "家长报告", icon: Users },
  { name: "设置", icon: Settings2 },
];
const fresh = (): Mistake => ({
  id: uid(),
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  date: localDay(),
  subject: "数学",
  topic: "",
  description: "",
  wrongAnswer: "",
  answer: "",
  reason: "审题不清",
  difficulty: "中等",
  note: "",
  nextDate: addDays(localDay(), 1),
  streak: 0,
  focus: false,
  demo: false,
});
const counts = <T,>(items: T[], fn: (item: T) => string) =>
  Object.entries(
    items.reduce<Record<string, number>>((a, x) => {
      const k = fn(x);
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
function Image({ photo, large = false }: { photo?: Photo; large?: boolean }) {
  const [url, setUrl] = useState(""),
    [bad, setBad] = useState(false);
  useEffect(() => {
    if (!photo) return;
    const u = URL.createObjectURL(photo.blob);
    queueMicrotask(() => setUrl(u));
    return () => URL.revokeObjectURL(u);
  }, [photo]);
  return url && !bad ? (
    <img
      src={url}
      alt="错题照片"
      className={
        large
          ? "max-h-72 max-w-full rounded-xl object-contain"
          : "h-24 w-28 rounded-xl object-cover"
      }
      onError={() => setBad(true)}
    />
  ) : (
    <div className="h-24 w-28 rounded-xl bg-slate-100 grid place-items-center text-xs text-slate-400">
      无图片或图片损坏
    </div>
  );
}
function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      {title && <h2 className="text-lg font-bold mb-3">{title}</h2>}
      {children}
    </section>
  );
}
function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-black text-indigo-600 mt-2">{value}</div>
    </Card>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
      {children}
    </p>
  );
}
function Demo({ yes }: { yes: boolean }) {
  return yes ? (
    <small className="ml-1 rounded bg-amber-100 px-1 text-amber-700">
      演示
    </small>
  ) : null;
}
export default function App() {
  const [page, setPage] = useState<Page>("首页"),
    [edit, setEdit] = useState<Mistake | null>(null),
    [message, setMessage] = useState(""),
    [readError, setReadError] = useState(""),
    [moreOpen, setMoreOpen] = useState(false);
  const mistakes = useLiveQuery(() => db.mistakes.toArray(), []) || [],
    photos = useLiveQuery(() => db.photos.toArray(), []) || [],
    reviews = useLiveQuery(() => db.reviews.toArray(), []) || [],
    rewards = useLiveQuery(() => db.rewards.toArray(), []) || [];
  useEffect(() => {
    db.mistakes
      .count()
      .then(() => syncRewards())
      .catch(() => setReadError("本地数据读取失败，请检查浏览器存储权限。"));
  }, []);
  const photoMap = useMemo(() => {
    const m = new Map<string, Photo[]>();
    photos.forEach((p) =>
      m.set(p.mistakeId, [...(m.get(p.mistakeId) || []), p]),
    );
    return m;
  }, [photos]);
  const flash = (s: string) => {
    setMessage(s);
    setTimeout(() => setMessage(""), 4500);
  };
  const go = (p: Page) => {
    setPage(p);
    setMoreOpen(false);
    scrollTo(0, 0);
  };
  return (
    <div className="min-h-screen bg-[#f5f7ff] text-slate-700">
      <aside className="sidebar">
        <div className="brand mb-8">
          <span className="brand-mark">🏝️</span>
          <span>错题成长岛</span>
        </div>
        {pages.map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={"nav " + (page === name ? "active" : "")}
            onClick={() => go(name)}
          >
            <Icon size={19} strokeWidth={2.1} />
            {name}
          </button>
        ))}
        <p className="absolute bottom-5 text-xs text-slate-400 pr-5">
          记录仅保存在当前浏览器。请定期导出备份，清理浏览器数据可能导致记录丢失。
        </p>
      </aside>
      <header className="mobile-header md:hidden print:hidden">
        <span className="brand-mark">🏝️</span>
        <span>错题成长岛</span>
      </header>
      <main className="md:ml-56 p-4 pb-28 md:p-8 max-w-7xl print:ml-0 print:p-0">
        {message && <div className="notice">{message}</div>}
        {readError && <div className="notice text-red-700">{readError}</div>}
        {mistakes.some((m) => m.demo) && page !== "设置" && (
          <div className="demo-banner">
            当前包含 {mistakes.filter((m) => m.demo).length}{" "}
            道演示错题；本页统计包含演示记录。
            <button onClick={() => go("设置")}>管理演示数据</button>
          </div>
        )}
        {page === "首页" && (
          <Home
            mistakes={mistakes}
            reviews={reviews}
            rewardCount={rewards.length}
            go={go}
            add={() => {
              setEdit(null);
              go("添加错题");
            }}
          />
        )}
        {page === "添加错题" && (
          <Editor
            key={edit?.id || "new"}
            item={edit}
            photos={edit ? photoMap.get(edit.id) || [] : []}
            done={() => {
              setEdit(null);
              go("错题本");
              flash("错题保存成功");
            }}
            cancel={() => go("错题本")}
          />
        )}
        {page === "错题本" && (
          <Book
            mistakes={mistakes}
            photos={photoMap}
            reviews={reviews}
            edit={(m) => {
              setEdit(m);
              go("添加错题");
            }}
            flash={flash}
          />
        )}
        {page === "复习挑战" && (
          <ReviewPage mistakes={mistakes} photos={photoMap} flash={flash} />
        )}
        {page === "错题分析" && (
          <Analysis mistakes={mistakes} reviews={reviews} />
        )}
        {page === "家长报告" && (
          <Report mistakes={mistakes} reviews={reviews} />
        )}
        {page === "设置" && <Settings mistakes={mistakes} flash={flash} />}
      </main>
      {moreOpen && (
        <div
          className="more-sheet md:hidden print:hidden"
          role="menu"
          aria-label="更多页面"
        >
          {pages.slice(4).map(({ name, icon: Icon }) => (
            <button key={name} onClick={() => go(name)} role="menuitem">
              <Icon size={19} />
              {name}
              <ChevronRight size={16} className="ml-auto" />
            </button>
          ))}
        </div>
      )}
      <nav className="bottomnav">
        {pages.slice(0, 4).map(({ name, icon: Icon }) => (
          <button
            key={name}
            className={page === name ? "active" : ""}
            onClick={() => go(name)}
          >
            <Icon size={21} />
            <span>{name}</span>
          </button>
        ))}
        <button
          className={
            moreOpen || ["错题分析", "家长报告", "设置"].includes(page)
              ? "active"
              : ""
          }
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-label="更多页面"
        >
          <Menu size={21} />
          <span>更多</span>
        </button>
      </nav>
    </div>
  );
}
function Home({
  mistakes,
  reviews,
  rewardCount,
  go,
  add,
}: {
  mistakes: Mistake[];
  reviews: Review[];
  rewardCount: number;
  go: (page: Page) => void;
  add: () => void;
}) {
  const today = localDay();
  const task = todayTaskProgress(mistakes, reviews, today);
  const weeklyTopics = topTopics(mistakes, weekStart(today), today);
  const suggestions = homeSuggestions(mistakes, reviews, today);
  const learned = mistakes.filter(
    (m) => status(m, today) === "暂时掌握",
  ).length;
  const studyDays = new Set(reviews.map((r) => r.localDate));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if (studyDays.has(addDays(today, -i))) streak++;
    else if (i > 0) break;
  }
  const achievements = [
    rewardCount >= 1 ? "复习启航" : null,
    rewardCount >= 10 ? "十次坚持" : null,
    rewardCount >= 30 ? "复习达人" : null,
    streak >= 3 ? "连续三天" : null,
  ].filter(Boolean);
  return (
    <div className="home-page">
      <div className="home-intro">
        <div>
          <p className="eyebrow">LEARNING TODAY · {today}</p>
          <h1 className="title mb-1">今天的学习，从一道题开始</h1>
          <p className="text-slate-500 text-sm">
            把错过的题目，变成下一次会做的题目。
          </p>
        </div>
        <div className="reward-pill" title="每道题每天最多获得一颗星星">
          <Star size={18} fill="currentColor" />
          <strong>{rewardCount}</strong> 颗成长星星
        </div>
      </div>

      <section className="task-hero" aria-label="今日学习任务">
        <div className="task-hero-content">
          <div className="hero-kicker">
            <Sparkles size={16} /> 今日学习任务
          </div>
          <h2>
            今天有 <strong>{task.due.length}</strong> 道题待复习
          </h2>
          <p>
            {task.due.length
              ? "先自己想一想，再核对答案。"
              : task.completed
                ? "今天到期的任务已完成，可以整理一道新错题。"
                : "今天暂无到期错题，可以先整理一道新题。"}
          </p>
          <div className="task-facts">
            <span>
              <Clock3 size={16} /> 预计约 {task.estimatedMinutes} 分钟
            </span>
            <span>
              已完成 {task.completed} / {task.total} 道
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="今日任务完成进度"
            aria-valuenow={task.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${task.percent}%` }} />
          </div>
          <div className="task-hero-actions">
            <button className="whitebtn" onClick={() => go("复习挑战")}>
              {task.due.length ? "开始复习" : "查看复习计划"}
              <ChevronRight size={18} />
            </button>
            <span>
              {task.total ? `${task.percent}% 已完成` : "暂无到期任务"}
            </span>
          </div>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span>✓</span>
        </div>
      </section>

      <div className="core-metrics">
        <Metric title="累计错题" value={mistakes.length} />
        <Metric title="今日待复习" value={task.due.length} />
        <Metric title="累计复习次数" value={reviews.length} />
        <Metric title="暂时掌握" value={learned} />
      </div>

      <div className="home-grid">
        <Card title="本周错题诊断">
          <p className="section-subtitle">
            本周录入最多的 3 个知识点 · {weekStart(today)} 至 {today}
          </p>
          {weeklyTopics.length ? (
            weeklyTopics.map((topic, index) => (
              <div className="topic-rank" key={topic.name}>
                <span className="rank-num">{index + 1}</span>
                <div className="topic-rank-main">
                  <div>
                    <strong>{topic.name}</strong>
                    <span>{topic.count} 道</span>
                  </div>
                  <div className="topic-bar">
                    <span
                      style={{
                        width: `${Math.round((topic.count / weeklyTopics[0].count) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Empty>本周还没有录入错题。可以先保存一道需要回看的题。</Empty>
          )}
          {mistakes.some((m) => m.demo) && (
            <p className="demo-note">当前统计包含已标记的演示数据。</p>
          )}
        </Card>
        <Card title="给今天的复习建议">
          <p className="section-subtitle">依据错题和复习记录的固定规则生成</p>
          {suggestions.length ? (
            suggestions.map((tip) => (
              <div className="suggestion" key={tip}>
                <Sparkles size={17} />
                <span>{tip}</span>
              </div>
            ))
          ) : (
            <Empty>记录第一道错题后，这里会给出可执行的复习建议。</Empty>
          )}
          {task.due.length > 0 && (
            <div className="due-preview">
              <b>优先复习</b>
              {task.due.slice(0, 3).map((m) => (
                <span key={m.id}>
                  {m.subject} · {m.topic}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="growth-line">
        <Star size={17} fill="currentColor" />
        <span>连续学习 {streak} 天</span>
        <span className="growth-separator">·</span>
        <span>已解锁 {achievements.length} 个成就</span>
        {achievements.length > 0 && (
          <span className="achievement-names">{achievements.join(" · ")}</span>
        )}
      </div>
      <section className="quick-section">
        <h2>快捷入口</h2>
        <div className="quick-grid">
          <button onClick={add}>
            <CirclePlus size={20} />
            <span>添加错题</span>
            <ChevronRight size={17} />
          </button>
          <button onClick={() => go("错题本")}>
            <BookOpen size={20} />
            <span>打开错题本</span>
            <ChevronRight size={17} />
          </button>
          <button onClick={() => go("错题分析")}>
            <ChartNoAxesCombined size={20} />
            <span>查看错题分析</span>
            <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

function Settings({
  mistakes,
  flash,
}: {
  mistakes: Mistake[];
  flash: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const demoCount = mistakes.filter((m) => m.demo).length;
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      flash(`操作失败：${String(error)}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-page max-w-4xl">
      <p className="eyebrow">DATA & BACKUP</p>
      <h1 className="title">设置与数据管理</h1>
      <p className="text-slate-500 mb-6">
        备份包含错题照片、复习历史和奖励。数据只保存在当前浏览器，请定期导出。
      </p>
      <div className="settings-grid">
        <Metric title="真实错题" value={mistakes.length - demoCount} />
        <Metric title="演示错题" value={demoCount} />
      </div>
      <Card title="备份与恢复">
        <p className="section-subtitle">
          导出一个完整 JSON 文件；导入时先校验再合并，相同 ID 的记录会跳过。
        </p>
        <div className="settings-actions">
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const blob = await exportBackup();
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `错题成长岛-${localDay()}.json`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                flash("完整备份已导出");
              })
            }
          >
            导出完整备份
          </button>
          <label className="outline cursor-pointer">
            导入备份
            <input
              type="file"
              className="sr-only"
              accept=".json,application/json"
              disabled={busy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (
                  !file ||
                  !confirm("导入将合并不存在的记录，相同 ID 会跳过。继续吗？")
                )
                  return;
                await run(async () => {
                  const count = await importBackup(file);
                  await syncRewards();
                  flash(`导入完成，新增 ${count} 道错题`);
                });
              }}
            />
          </label>
        </div>
      </Card>
      <Card title="演示数据">
        <p className="section-subtitle">
          可加载 25 道标记为“演示”的错题。清除演示数据不会删除真实错题。
        </p>
        <div className="settings-actions">
          <button
            className="outline"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const count = await loadDemo();
                await syncRewards();
                flash(count ? `加载 ${count} 条演示数据` : "演示数据已存在");
              })
            }
          >
            加载演示数据
          </button>
          <button
            className="outline danger-outline"
            disabled={busy || !demoCount}
            onClick={() => {
              if (confirm("只清除演示数据，真实记录保留。确定吗？"))
                run(async () => {
                  await clearDemo();
                  flash("演示数据已清除");
                });
            }}
          >
            清除演示数据
          </button>
        </div>
      </Card>
      <p className="data-warning">
        清理浏览器站点数据、更换浏览器或设备都可能使本地记录不可见。请先导出备份。
      </p>
    </div>
  );
}
function Editor({
  item,
  photos,
  done,
  cancel,
}: {
  item: Mistake | null;
  photos: Photo[];
  done: () => void;
  cancel: () => void;
}) {
  const [form, setForm] = useState(item || fresh),
    [files, setFiles] = useState<File[]>([]),
    [removed, setRemoved] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const u = files.map(URL.createObjectURL);
    queueMicrotask(() => setUrls(u));
    return () => u.forEach(URL.revokeObjectURL);
  }, [files]);
  const set = <K extends keyof Mistake>(k: K, v: Mistake[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  async function upload(fs: FileList | null) {
    if (!fs) return;
    try {
      const prepared = await Promise.all(Array.from(fs).map(compressImage));
      setFiles((a) => [...a, ...prepared]);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  async function save() {
    if (busy) return;
    if (!form.topic.trim()) {
      setError("请填写知识点");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.nextDate)
    ) {
      setError("请选择有效日期");
      return;
    }
    if (
      !form.description.trim() &&
      !files.length &&
      photos.length === removed.length
    ) {
      setError("至少需要一张照片或题目描述");
      return;
    }
    setBusy(true);
    try {
      await saveMistake(
        { ...form, topic: form.topic.trim(), updatedAt: Date.now() },
        files,
        removed,
      );
      done();
    } catch (e) {
      setError(`保存失败，可能是存储空间不足：${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-4xl">
      <h1 className="title">{item ? "编辑错题" : "添加错题"}</h1>
      <Card>
        <div className="space-y-4">
          <label className="field">
            错题照片
            <input
              className="input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              multiple
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
            <small>
              支持多张 JPG、PNG、WebP，单张不超过 15 MB；保存前自动压缩。
            </small>
          </label>
          <div className="flex flex-wrap gap-3">
            {photos
              .filter((p) => !removed.includes(p.id))
              .map((p) => (
                <div key={p.id}>
                  <Image photo={p} />
                  <button
                    className="link"
                    onClick={() => setRemoved((a) => [...a, p.id])}
                  >
                    删除
                  </button>
                </div>
              ))}
            {files.map((f, i) => (
              <div key={i}>
                <img
                  src={urls[i]}
                  alt={f.name}
                  className="h-24 w-28 object-cover rounded-xl"
                />
                <button
                  className="link"
                  onClick={() => setFiles((a) => a.filter((_, j) => j !== i))}
                >
                  删除 / 替换
                </button>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="field">
              科目 *
              <select
                className="input"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value as Subject)}
              >
                {subjects.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              知识点 *
              <input
                className="input"
                value={form.topic}
                maxLength={50}
                onChange={(e) => set("topic", e.target.value)}
                placeholder="如：分数加减法"
              />
            </label>
          </div>
          <label className="field">
            题目描述
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="field">
              我的错误答案
              <textarea
                className="input"
                value={form.wrongAnswer}
                onChange={(e) => set("wrongAnswer", e.target.value)}
              />
            </label>
            <label className="field">
              正确答案
              <textarea
                className="input"
                value={form.answer}
                onChange={(e) => set("answer", e.target.value)}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="field">
              错误原因 *
              <select
                className="input"
                value={form.reason}
                onChange={(e) => set("reason", e.target.value as Reason)}
              >
                {reasons.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              难度
              <select
                className="input"
                value={form.difficulty}
                onChange={(e) =>
                  set("difficulty", e.target.value as Mistake["difficulty"])
                }
              >
                {["简单", "中等", "困难"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className="field">
              错题日期
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            订正笔记
            <textarea
              className="input"
              rows={3}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </label>
          {item && (
            <label className="field">
              下次复习日期
              <input
                className="input"
                type="date"
                value={form.nextDate}
                onChange={(e) => set("nextDate", e.target.value)}
              />
            </label>
          )}
          {error && <p className="text-rose-600">{error}</p>}
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? "保存中…" : "保存错题"}
          </button>
          <button className="outline ml-3" onClick={cancel}>
            取消
          </button>
        </div>
      </Card>
    </div>
  );
}
function Book({
  mistakes,
  photos,
  reviews,
  edit,
  flash,
}: {
  mistakes: Mistake[];
  photos: Map<string, Photo[]>;
  reviews: Review[];
  edit: (m: Mistake) => void;
  flash: (s: string) => void;
}) {
  const [q, Q] = useState(""),
    [subject, S] = useState("全部"),
    [topic, T] = useState("全部"),
    [reason, R] = useState("全部"),
    [state, V] = useState("全部"),
    [sort, O] = useState("新到旧"),
    [detail, D] = useState<Mistake | null>(null);
  const topics = [...new Set(mistakes.map((m) => m.topic))].sort();
  const shown = mistakes
    .filter(
      (m) =>
        (subject === "全部" || m.subject === subject) &&
        (topic === "全部" || m.topic === topic) &&
        (reason === "全部" || m.reason === reason) &&
        (state === "全部" || status(m) === state) &&
        `${m.description} ${m.topic} ${m.note}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "新到旧" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );
  async function remove(m: Mistake) {
    if (!confirm(`确定删除“${m.topic}”吗？图片和复习历史也会删除。`)) return;
    try {
      await deleteMistake(m.id);
      D(null);
      flash("错题及关联记录已删除");
    } catch (e) {
      flash(`删除失败：${String(e)}`);
    }
  }
  return (
    <>
      <h1 className="title">我的错题本</h1>
      <Card>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="搜索题目、知识点和笔记"
            value={q}
            onChange={(e) => Q(e.target.value)}
          />
          <select
            className="input"
            value={subject}
            onChange={(e) => S(e.target.value)}
          >
            {["全部", ...subjects].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="input"
            value={topic}
            onChange={(e) => T(e.target.value)}
          >
            {["全部", ...topics].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="input"
            value={reason}
            onChange={(e) => R(e.target.value)}
          >
            {["全部", ...reasons].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="input"
            value={state}
            onChange={(e) => V(e.target.value)}
          >
            {["全部", "待复习", "复习中", "暂时掌握"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            className="input"
            value={sort}
            onChange={(e) => O(e.target.value)}
          >
            {["新到旧", "旧到新"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      </Card>
      <p className="text-sm my-4">共 {shown.length} 道</p>
      {!shown.length ? (
        <Empty>暂无符合条件的错题。</Empty>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map((m) => (
            <Card key={m.id}>
              <div className="flex gap-3">
                <Image photo={photos.get(m.id)?.[0]} />
                <div>
                  <b>
                    {m.subject} · {m.topic}
                    <Demo yes={m.demo} />
                  </b>
                  <p className="text-xs mt-2">
                    {m.reason} · {m.date}
                  </p>
                  <p className="text-xs text-indigo-600 mt-2">
                    {status(m)} · 下次 {m.nextDate}
                  </p>
                </div>
              </div>
              <p className="text-sm my-3 line-clamp-2">
                {m.description || "图片题目"}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button className="mini" onClick={() => D(m)}>
                  查看
                </button>
                <button className="mini" onClick={() => edit(m)}>
                  编辑
                </button>
                <button
                  className="mini"
                  onClick={async () => {
                    await db.mistakes.update(m.id, {
                      focus: !m.focus,
                      updatedAt: Date.now(),
                    });
                    flash(m.focus ? "已取消重点" : "已标记重点");
                  }}
                >
                  {m.focus ? "★ 重点" : "☆ 标重点"}
                </button>
                <button
                  className="mini text-rose-600"
                  onClick={() => remove(m)}
                >
                  删除
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {detail && (
        <div className="overlay" onClick={() => D(null)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mistake-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="float-right" onClick={() => D(null)}>
              ✕
            </button>
            <h2 className="text-xl font-bold" id="mistake-detail-title">
              {detail.subject} · {detail.topic}
              <Demo yes={detail.demo} />
            </h2>
            <div className="flex flex-wrap gap-3 my-4">
              {(photos.get(detail.id) || []).map((p) => (
                <Image key={p.id} photo={p} large />
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <p>题目：{detail.description || "见图片"}</p>
              <p>错误答案：{detail.wrongAnswer || "未填写"}</p>
              <p>正确答案：{detail.answer || "未填写，请自行核对"}</p>
              <p>原因：{detail.reason}</p>
              <p>订正：{detail.note || "未填写"}</p>
              <p>下次复习：{detail.nextDate}</p>
            </div>
            <div className="review-history">
              <h3>复习时间线</h3>
              {reviews.filter((r) => r.mistakeId === detail.id).length ? (
                <ol className="timeline">
                  {reviews
                    .filter((r) => r.mistakeId === detail.id)
                    .sort((a, b) => b.at - a.at)
                    .map((r) => (
                      <li key={r.id}>
                        <span
                          className={`timeline-dot ${r.result}`}
                          aria-hidden="true"
                        />
                        <div className="timeline-content">
                          <div className="timeline-head">
                            <strong>
                              {r.result === "independent"
                                ? "独立做对"
                                : r.result === "hinted"
                                  ? "提示后做对"
                                  : "仍然做错"}
                            </strong>
                            <time dateTime={new Date(r.at).toISOString()}>
                              {new Date(r.at).toLocaleString("zh-CN")}
                            </time>
                          </div>
                          <p>
                            原计划 {r.scheduledDate} · 复习间隔 {r.intervalDays}{" "}
                            天
                          </p>
                          <p>
                            下一次安排：<b>{reviewNextDate(r)}</b>
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              ) : (
                <Empty>这道题尚未复习。查看答案不会改变掌握状态。</Empty>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function ReviewPage({
  mistakes,
  photos,
  flash,
}: {
  mistakes: Mistake[];
  photos: Map<string, Photo[]>;
  flash: (s: string) => void;
}) {
  const [reveal, A] = useState(false),
    [attempt, B] = useState(""),
    [busy, C] = useState(false);
  const due = mistakes
      .filter((m) => m.nextDate <= localDay())
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
    m = due[0];
  async function finish(result: Result) {
    if (!m || busy) return;
    C(true);
    try {
      const nextDate = await recordReview(m, result);
      A(false);
      B("");
      flash(`复习已保存，下次复习：${nextDate}`);
    } catch (e) {
      flash(`保存失败：${String(e)}`);
    } finally {
      C(false);
    }
  }
  return (
    <div className="max-w-4xl">
      <h1 className="title">复习挑战</h1>
      <p className="mb-4 text-sm">
        当前到期 {due.length} 道，其中逾期{" "}
        {due.filter((m) => m.nextDate < localDay()).length} 道。
      </p>
      {!m ? (
        <Empty>没有到期错题。可在错题本里调整下次复习日期。</Empty>
      ) : (
        <Card>
          <div className="flex justify-between">
            <b>
              {m.subject} · {m.topic}
              <Demo yes={m.demo} />
            </b>
            <span className="text-xs">计划 {m.nextDate}</span>
          </div>
          <div className="flex flex-wrap gap-3 my-4">
            {(photos.get(m.id) || []).map((p) => (
              <Image photo={p} key={p.id} large />
            ))}
          </div>
          <p className="whitespace-pre-wrap">
            {m.description || "请看图片中的题目"}
          </p>
          <textarea
            className="input my-4"
            rows={3}
            value={attempt}
            onChange={(e) => B(e.target.value)}
            placeholder="可在这里记录思路，也可以在纸上独立完成；系统不自动判题"
          />
          {!reveal ? (
            <div>
              <button className="btn" onClick={() => A(true)}>
                查看答案
              </button>
              <p className="text-xs text-slate-500 mt-2">
                查看答案只用于核对，不会自动更改掌握状态。
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-indigo-50 p-4 mb-4">
                <b>正确答案</b>
                <p className="whitespace-pre-wrap my-2">
                  {m.answer || "未录入正确答案，请自行对照课本或老师讲解核对。"}
                </p>
                <b>订正笔记</b>
                <p className="whitespace-pre-wrap">{m.note || "未填写"}</p>
              </div>
              <p className="text-xs mb-3">
                请诚实记录。提示后做对会在 2 天后复习，不计入连续独立做对。
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  disabled={busy}
                  className="btn"
                  onClick={() => finish("independent")}
                >
                  独立做对
                </button>
                <button
                  disabled={busy}
                  className="outline"
                  onClick={() => finish("hinted")}
                >
                  提示后做对
                </button>
                <button
                  disabled={busy}
                  className="outline"
                  onClick={() => finish("wrong")}
                >
                  仍然做错
                </button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
function Trend({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" interval="preserveStartEnd" fontSize={10} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line dataKey="value" stroke="#6668e7" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
function Analysis({
  mistakes,
  reviews,
}: {
  mistakes: Mistake[];
  reviews: Review[];
}) {
  const [topicFilter, setTopicFilter] = useState("全部知识点");
  const topicOptions = [...new Set(mistakes.map((m) => m.topic))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
  const visibleMistakes =
    topicFilter === "全部知识点"
      ? mistakes
      : mistakes.filter((m) => m.topic === topicFilter);
  const visibleIds = new Set(visibleMistakes.map((m) => m.id));
  const visibleReviews = reviews.filter((r) => visibleIds.has(r.mistakeId));
  const subjectsData = counts(visibleMistakes, (m) => m.subject),
    reasonsData = counts(visibleMistakes, (m) => m.reason),
    topics = counts(visibleMistakes, (m) => m.topic),
    wrong = visibleReviews.filter((r) => r.result === "wrong");
  const trend = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = addDays(localDay(), i - n + 1);
      return {
        name: d.slice(5),
        value: visibleMistakes.filter((m) => m.date === d).length,
      };
    });
  const repeated = repeatedWrong(visibleMistakes, visibleReviews);
  return (
    <>
      <h1 className="title">错题分析中心</h1>
      <p className="text-sm mb-4">
        基于本地记录的规则分析，不是 AI 自动诊断。当前范围：录入错题{" "}
        {visibleMistakes.length} 道 · 复习 {visibleReviews.length} 次 ·
        复习中再次做错 {wrong.length} 次。
      </p>
      <div className="analysis-filter print:hidden">
        <label htmlFor="analysis-topic">按知识点查看</label>
        <select
          id="analysis-topic"
          className="input"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
        >
          <option>全部知识点</option>
          {topicOptions.map((topic) => (
            <option key={topic}>{topic}</option>
          ))}
        </select>
        {topicFilter !== "全部知识点" && (
          <button
            className="outline"
            onClick={() => setTopicFilter("全部知识点")}
          >
            清除筛选
          </button>
        )}
      </div>
      {!mistakes.length ? (
        <Empty>暂无数据，添加错题后查看分析。</Empty>
      ) : !visibleMistakes.length ? (
        <Empty>这个知识点暂无错题记录。可清除筛选查看全部分析。</Empty>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <Metric
              title="待复习"
              value={
                visibleMistakes.filter((m) => status(m) === "待复习").length
              }
            />
            <Metric
              title="复习中"
              value={
                visibleMistakes.filter((m) => status(m) === "复习中").length
              }
            />
            <Metric
              title="暂时掌握"
              value={
                visibleMistakes.filter((m) => status(m) === "暂时掌握").length
              }
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="科目错题数量和占比">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={subjectsData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={78}
                    label={({ name, value }) => `${name} ${value}`}
                  >
                    {subjectsData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          ["#6668e7", "#43c7aa", "#f6ae63", "#92a5eb"][i % 4]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {subjectsData.map((x) => (
                <div className="row" key={x.name}>
                  {x.name}
                  <b>
                    {x.value} 道 ·{" "}
                    {Math.round((x.value / visibleMistakes.length) * 100)}%
                  </b>
                </div>
              ))}
            </Card>
            <Card title="错误原因数量和占比">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={reasonsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6668e7" />
                </BarChart>
              </ResponsiveContainer>
              {reasonsData.map((x) => (
                <div className="row" key={x.name}>
                  {x.name}
                  <b>
                    {x.value} 道 ·{" "}
                    {Math.round((x.value / visibleMistakes.length) * 100)}%
                  </b>
                </div>
              ))}
            </Card>
            <Card title="最近 7 天录入趋势">
              <Trend data={trend(7)} />
            </Card>
            <Card title="最近 30 天录入趋势">
              <Trend data={trend(30)} />
            </Card>
            <Card title="知识点错题排行">
              {topics.slice(0, 10).map((x) => (
                <div className="row" key={x.name}>
                  {x.name}
                  <b>{x.value} 道</b>
                </div>
              ))}
            </Card>
            <Card title="知识点复习表现">
              {topics
                .map((x) => ({
                  name: x.name,
                  total: visibleReviews.filter(
                    (r) =>
                      visibleMistakes.find((m) => m.id === r.mistakeId)
                        ?.topic === x.name,
                  ).length,
                  wrong: wrong.filter(
                    (r) =>
                      visibleMistakes.find((m) => m.id === r.mistakeId)
                        ?.topic === x.name,
                  ).length,
                }))
                .filter((x) => x.total)
                .map((x) => (
                  <div className="row" key={x.name}>
                    {x.name}
                    <span>
                      复习 {x.total} · 再错 {x.wrong}
                    </span>
                  </div>
                ))}
              {!visibleReviews.length && <Empty>当前知识点暂无复习记录</Empty>}
            </Card>
            <Card title="复习中再次做错次数（按题）">
              {repeated.length ? (
                repeated.slice(0, 8).map((x) => (
                  <div className="row" key={x.mistake.id}>
                    {x.mistake.subject} · {x.mistake.topic}
                    <b>{x.count} 次</b>
                  </div>
                ))
              ) : (
                <Empty>暂无再次做错记录</Empty>
              )}
            </Card>
            <Card title="规则建议">
              {topics[0]?.value >= 3 && (
                <p>• {topics[0].name} 录入较多，可优先复习。</p>
              )}
              {topics
                .filter(
                  (t) =>
                    wrong.filter(
                      (r) =>
                        visibleMistakes.find((m) => m.id === r.mistakeId)
                          ?.topic === t.name,
                    ).length >= 2,
                )
                .map((t) => (
                  <p key={t.name}>
                    • {t.name} 在复习记录中多次做错，建议重新学习基础概念。
                  </p>
                ))}
              {visibleMistakes.filter((m) => m.nextDate < localDay()).length >=
                3 && <p>• 逾期任务较多，可以调整每天复习数量。</p>}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
function Report({
  mistakes,
  reviews,
}: {
  mistakes: Mistake[];
  reviews: Review[];
}) {
  const [range, R] = useState<7 | 30>(7),
    today = localDay(),
    start = range === 7 ? weekStart(today) : addDays(today, -29),
    added = mistakes.filter((m) => m.date >= start && m.date <= today),
    done = reviews.filter((r) => r.localDate >= start && r.localDate <= today),
    scheduled =
      done.filter((r) => r.scheduledDate >= start && r.scheduledDate <= today)
        .length +
      mistakes.filter((m) => m.nextDate >= start && m.nextDate <= today).length,
    completed = done.filter(
      (r) => r.scheduledDate >= start && r.scheduledDate <= today,
    ).length,
    weak = counts(
      mistakes.filter(
        (m) =>
          m.focus ||
          reviews.some((r) => r.mistakeId === m.id && r.result === "wrong"),
      ),
      (m) => m.topic,
    ).slice(0, 5),
    repeat = repeatedWrong(mistakes, reviews).filter((x) => x.count >= 2),
    comparison = weekComparison(mistakes, reviews, today),
    weeks = Array.from({ length: 4 }, (_, i) => {
      const end = addDays(today, (i - 3) * 7),
        begin = addDays(end, -6);
      return {
        name: `第${i + 1}周`,
        value: reviews.filter((r) => r.localDate >= begin && r.localDate <= end)
          .length,
      };
    });
  return (
    <div className="print-report">
      <div className="flex justify-between">
        <h1 className="title">家长报告</h1>
        <button className="outline print:hidden" onClick={() => print()}>
          打印 / 保存 PDF
        </button>
      </div>
      <p className="text-sm mb-4">
        统计范围：{start} 至 {today}。次数只表示记录量，不代表学习能力提高。
      </p>
      <div className="flex gap-2 mb-5 print:hidden">
        <button
          className={range === 7 ? "btn" : "outline"}
          onClick={() => R(7)}
        >
          本周（周一至今）
        </button>
        <button
          className={range === 30 ? "btn" : "outline"}
          onClick={() => R(30)}
        >
          最近 30 天
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric title="新增错题" value={added.length} />
        <Metric title="完成复习次数" value={done.length} />
        <Metric
          title="计划任务完成率"
          value={
            scheduled ? `${Math.round((completed / scheduled) * 100)}%` : "—"
          }
        />
        <Metric
          title="当前待复习"
          value={mistakes.filter((m) => m.nextDate <= today).length}
        />
      </div>
      <p className="text-xs mt-2">
        完成率按到期计划及相应复习记录估算；手动改期可能影响历史口径。
      </p>
      <Card title="本周与上周对比">
        <p className="text-xs text-slate-500 mb-3">
          本周 {comparison.current.from} 至 {comparison.current.to}；上周{" "}
          {comparison.previous.from} 至 {comparison.previous.to}
          。本周尚未结束，记录量只用于观察趋势。
        </p>
        <div className="comparison-grid">
          {(
            [
              ["新增错题", "added", "道"],
              ["完成复习", "reviews", "次"],
              ["复习中再次做错", "wrong", "次"],
            ] as const
          ).map(([label, key, unit]) => (
            <div className="comparison-item" key={key}>
              <span>{label}</span>
              <strong>
                {comparison.current[key]}
                {unit}
              </strong>
              <small>
                上周 {comparison.previous[key]}
                {unit} ·{" "}
                {comparison.current[key] === comparison.previous[key]
                  ? "持平"
                  : `${comparison.current[key] > comparison.previous[key] ? "增加" : "减少"} ${Math.abs(comparison.current[key] - comparison.previous[key])}${unit}`}
              </small>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid lg:grid-cols-2 gap-4 mt-5">
        <Card title="重点薄弱知识点">
          {weak.length ? (
            weak.map((x) => (
              <div className="row" key={x.name}>
                {x.name}
                <b>{x.value} 道</b>
              </div>
            ))
          ) : (
            <Empty>暂无重点记录</Empty>
          )}
        </Card>
        <Card title="反复做错的题目">
          {repeat.length ? (
            repeat.map((x) => (
              <div className="row" key={x.mistake.id}>
                {x.mistake.subject} · {x.mistake.topic}
                <b>{x.count} 次</b>
              </div>
            ))
          ) : (
            <Empty>暂无同一道题多次做错记录</Empty>
          )}
        </Card>
        <Card title="不同科目错题分布">
          {counts(mistakes, (m) => m.subject).map((x) => (
            <div className="row" key={x.name}>
              {x.name}
              <b>{x.value} 道</b>
            </div>
          ))}
        </Card>
        <Card title="最近四周复习趋势">
          <Trend data={weeks} />
        </Card>
        <Card title="下一周建议复习内容">
          <p>
            优先完成当前 {mistakes.filter((m) => m.nextDate <= today).length}{" "}
            道待复习错题。
          </p>
          {weak.slice(0, 2).map((x) => (
            <p key={x.name}>• 回看「{x.name}」的基础概念和订正笔记。</p>
          ))}
          <p className="text-xs mt-3">
            基于本地记录的规则建议，不是 AI 自动诊断。
          </p>
        </Card>
      </div>
    </div>
  );
}
