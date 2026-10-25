import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { test } from "node:test";

const {
  db,
  uid,
  localDay,
  addDays,
  recordReview,
  reviewNextDate,
  deleteMistake,
  loadDemo,
  clearDemo,
  exportBackup,
  importBackup,
} = await import("../src/lib/db");
const base = (streak = 0) => ({
  id: uid(),
  version: 1 as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  date: localDay(),
  subject: "数学" as const,
  topic: "分数",
  description: "1/2+1/3",
  wrongAnswer: "",
  answer: "5/6",
  reason: "计算粗心" as const,
  difficulty: "中等" as const,
  note: "",
  nextDate: localDay(),
  streak,
  focus: false,
  demo: false,
});

test("重复做错只按同一道题的真实复习记录统计", async () => {
  const { repeatedWrong } = await import("../src/lib/insights");
  const first = base(),
    second = base();
  const reviews = [
    {
      id: uid(),
      mistakeId: first.id,
      at: Date.now(),
      localDate: localDay(),
      scheduledDate: localDay(),
      result: "wrong" as const,
      intervalDays: 1,
      demo: false,
    },
    {
      id: uid(),
      mistakeId: first.id,
      at: Date.now(),
      localDate: localDay(),
      scheduledDate: localDay(),
      result: "wrong" as const,
      intervalDays: 1,
      demo: false,
    },
    {
      id: uid(),
      mistakeId: second.id,
      at: Date.now(),
      localDate: localDay(),
      scheduledDate: localDay(),
      result: "independent" as const,
      intervalDays: 3,
      demo: false,
    },
  ];
  assert.deepEqual(
    repeatedWrong([first, second], reviews).map((r) => [r.mistake.id, r.count]),
    [[first.id, 2]],
  );
});

test("家长报告周对比按本地日历周和不同指标计算", async () => {
  const { weekComparison } = await import("../src/lib/insights");
  const monday = "2026-10-19";
  const thisMistake = { ...base(), date: "2026-10-23" };
  const lastMistake = { ...base(), date: "2026-10-18" };
  const makeReview = (localDate: string, result: "wrong" | "independent") => ({
    id: uid(),
    mistakeId: thisMistake.id,
    at: Date.now(),
    localDate,
    scheduledDate: localDate,
    result,
    intervalDays: 1,
    demo: false,
  });
  const result = weekComparison(
    [thisMistake, lastMistake],
    [
      makeReview("2026-10-23", "wrong"),
      makeReview("2026-10-18", "independent"),
    ],
    "2026-10-23",
  );
  assert.equal(result.current.from, monday);
  assert.deepEqual(
    [result.current.added, result.current.reviews, result.current.wrong],
    [1, 1, 1],
  );
  assert.deepEqual(
    [result.previous.added, result.previous.reviews, result.previous.wrong],
    [1, 1, 0],
  );
});

test("备份恢复保留图片和复习记录，重复导入不会复制记录", async () => {
  class TestFileReader {
    result: string | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    async readAsDataURL(blob: Blob) {
      try {
        this.result = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
        this.onload?.();
      } catch {
        this.onerror?.();
      }
    }
  }
  const previous = globalThis.FileReader;
  globalThis.FileReader = TestFileReader as unknown as typeof FileReader;
  const mistake = base();
  try {
    await db.mistakes.add(mistake);
    await db.photos.add({
      id: uid(),
      mistakeId: mistake.id,
      blob: new Blob(["photo-data"], { type: "image/png" }),
      name: "test.png",
      mime: "image/png",
      createdAt: Date.now(),
      demo: false,
    });
    await recordReview(mistake, "wrong");
    const saved = await exportBackup();
    await deleteMistake(mistake.id);
    const backup = new File([saved], "backup.json", {
      type: "application/json",
    });
    assert.equal(await importBackup(backup), 1);
    assert.equal(await importBackup(backup), 0);
    assert.equal(
      await db.photos.where("mistakeId").equals(mistake.id).count(),
      1,
    );
    assert.equal(
      await db.reviews.where("mistakeId").equals(mistake.id).count(),
      1,
    );
    const image = await db.photos.where("mistakeId").equals(mistake.id).first();
    assert.equal(await image?.blob.text(), "photo-data");
  } finally {
    globalThis.FileReader = previous;
    await deleteMistake(mistake.id);
  }
});

test("独立做对依次安排 3、7、14、30 天", async () => {
  for (const [streak, days] of [
    [0, 3],
    [1, 7],
    [2, 14],
    [3, 30],
  ] as const) {
    const m = base(streak);
    await db.mistakes.add(m);
    const nextDate = await recordReview(m, "independent");
    assert.equal(nextDate, addDays(localDay(), days));
    assert.equal(
      (await db.mistakes.get(m.id))?.nextDate,
      addDays(localDay(), days),
    );
    assert.equal(
      (await db.reviews.where("mistakeId").equals(m.id).first())?.intervalDays,
      days,
    );
    assert.equal(
      (await db.reviews.where("mistakeId").equals(m.id).first())?.nextDate,
      nextDate,
    );
  }
});
test("旧复习记录没有 nextDate 时可从日期和间隔回算", async () => {
  const m = base();
  await db.mistakes.add(m);
  const oldReview = {
    id: uid(),
    mistakeId: m.id,
    at: Date.now(),
    localDate: localDay(),
    result: "independent" as const,
    intervalDays: 7,
    scheduledDate: localDay(),
    demo: false,
  };
  await db.reviews.add(oldReview);
  assert.equal(reviewNextDate(oldReview), addDays(localDay(), 7));
});
test("提示后做对缩短间隔，做错重置连续正确次数", async () => {
  const hinted = base(2),
    wrong = base(3);
  await db.mistakes.bulkAdd([hinted, wrong]);
  await recordReview(hinted, "hinted");
  await recordReview(wrong, "wrong");
  assert.equal(
    (await db.mistakes.get(hinted.id))?.nextDate,
    addDays(localDay(), 2),
  );
  assert.equal((await db.mistakes.get(hinted.id))?.streak, 0);
  assert.equal(
    (await db.mistakes.get(wrong.id))?.nextDate,
    addDays(localDay(), 1),
  );
  assert.equal((await db.mistakes.get(wrong.id))?.streak, 0);
});
test("删除错题同步清理图片、复习和奖励", async () => {
  const m = base();
  await db.mistakes.add(m);
  await db.photos.add({
    id: uid(),
    mistakeId: m.id,
    blob: new Blob(["x"], { type: "image/jpeg" }),
    name: "x.jpg",
    mime: "image/jpeg",
    createdAt: Date.now(),
    demo: false,
  });
  await recordReview(m, "wrong");
  await deleteMistake(m.id);
  assert.equal(await db.photos.where("mistakeId").equals(m.id).count(), 0);
  assert.equal(await db.reviews.where("mistakeId").equals(m.id).count(), 0);
  assert.equal(await db.rewards.where("mistakeId").equals(m.id).count(), 0);
});
test("演示数据可清除且真实记录保留", async () => {
  const real = base();
  await db.mistakes.add(real);
  assert.equal(await loadDemo(), 25);
  const demoWrong = await db.reviews
    .filter((r) => r.demo && r.result === "wrong")
    .toArray();
  assert.ok(
    demoWrong.some(
      (r) => demoWrong.filter((x) => x.mistakeId === r.mistakeId).length >= 2,
    ),
  );
  assert.equal(await loadDemo(), 0);
  await clearDemo();
  assert.equal(await db.mistakes.filter((m) => m.demo).count(), 0);
  assert.ok(await db.mistakes.get(real.id));
});
