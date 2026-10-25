import { addDays, localDay, type Mistake, type Review } from "./db";

export function weekStart(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(year, month - 1, date, 12).getDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function topTopics(
  mistakes: Mistake[],
  from: string,
  to: string,
  limit = 3,
) {
  const totals = new Map<string, number>();
  for (const mistake of mistakes) {
    if (mistake.date < from || mistake.date > to) continue;
    totals.set(mistake.topic, (totals.get(mistake.topic) || 0) + 1);
  }
  return [...totals]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"))
    .slice(0, limit);
}

export function todayTaskProgress(
  mistakes: Mistake[],
  reviews: Review[],
  today = localDay(),
) {
  const due = mistakes.filter((m) => m.nextDate <= today);
  const completedIds = new Set(
    reviews
      .filter((r) => r.localDate === today && r.scheduledDate <= today)
      .map((r) => r.mistakeId),
  );
  const total = due.length + completedIds.size;
  return {
    due,
    completed: completedIds.size,
    total,
    percent: total ? Math.round((completedIds.size / total) * 100) : 0,
    estimatedMinutes: due.length * 3,
  };
}

export function homeSuggestions(
  mistakes: Mistake[],
  reviews: Review[],
  today = localDay(),
) {
  const suggestions: string[] = [];
  const week = topTopics(mistakes, weekStart(today), today, 1)[0];
  const due = mistakes.filter((m) => m.nextDate <= today);
  const overdue = due.filter((m) => m.nextDate < today);
  const recentWrong = reviews.filter(
    (r) =>
      r.result === "wrong" &&
      r.localDate >= addDays(today, -6) &&
      r.localDate <= today,
  );
  if (overdue.length)
    suggestions.push(
      `有 ${overdue.length} 道逾期错题，建议先完成最早到期的题。`,
    );
  else if (due.length)
    suggestions.push(`今天有 ${due.length} 道待复习错题，可以先完成这一轮。`);
  if (week?.count >= 2)
    suggestions.push(
      `本周「${week.name}」录入 ${week.count} 道，建议集中回看订正思路。`,
    );
  if (recentWrong.length >= 2)
    suggestions.push(
      `近 7 天复习中再次做错 ${recentWrong.length} 次，建议核对相关基础概念。`,
    );
  if (!suggestions.length && mistakes.length)
    suggestions.push("当前没有到期任务，按已有日期继续复习即可。");
  return suggestions.slice(0, 3);
}

export function repeatedWrong(mistakes: Mistake[], reviews: Review[]) {
  const wrongById = new Map<string, number>();
  for (const review of reviews) {
    if (review.result === "wrong")
      wrongById.set(
        review.mistakeId,
        (wrongById.get(review.mistakeId) || 0) + 1,
      );
  }
  return mistakes
    .map((mistake) => ({ mistake, count: wrongById.get(mistake.id) || 0 }))
    .filter((row) => row.count > 0)
    .sort(
      (a, b) => b.count - a.count || a.mistake.id.localeCompare(b.mistake.id),
    );
}

export function weekComparison(
  mistakes: Mistake[],
  reviews: Review[],
  today = localDay(),
) {
  const currentStart = weekStart(today);
  const previousStart = addDays(currentStart, -7);
  const previousEnd = addDays(currentStart, -1);
  const summarize = (from: string, to: string) => ({
    added: mistakes.filter((m) => m.date >= from && m.date <= to).length,
    reviews: reviews.filter((r) => r.localDate >= from && r.localDate <= to)
      .length,
    wrong: reviews.filter(
      (r) => r.result === "wrong" && r.localDate >= from && r.localDate <= to,
    ).length,
  });
  return {
    current: {
      from: currentStart,
      to: today,
      ...summarize(currentStart, today),
    },
    previous: {
      from: previousStart,
      to: previousEnd,
      ...summarize(previousStart, previousEnd),
    },
  };
}
