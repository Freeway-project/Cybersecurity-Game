import type { ReactNode } from "react";

import { likertLabels, priorExperienceLabels } from "@/config/study";
import { Card } from "@/components/ui/card";
import type { AdminOverview, AdminParticipantReportRow } from "@/modules/admin/server";
import type { LevelId, LikertScore } from "@/types/study";

interface AdminConsoleProps {
  analysisExportHref: string;
  rawExportHref: string;
  overview: AdminOverview;
}

interface VerticalBarItem {
  label: string;
  value: number;
  displayValue: string;
  toneClass: string;
}

interface HorizontalBarItem {
  label: string;
  value: number;
  displayValue: string;
  toneClass: string;
}

interface DualMetricItem {
  label: string;
  primaryValue: number;
  primaryDisplayValue: string;
  secondaryValue: number;
  secondaryDisplayValue: string;
}

const levelLabels: Record<LevelId, string> = {
  "caesar-cipher":      "Caesar cipher",
  "xor-stream":         "XOR stream",
  "block-cipher":       "Block cipher",
  "phishing-inspector": "Phishing inspector",
  "network-defense":    "Network defense",
  "terminal-forensics": "Terminal forensics",
  "dual-role-defender": "Dual-role defender",
  "soc-triage":         "SOC triage",
};

const reportLevelIds: LevelId[] = [
  "caesar-cipher",
  "xor-stream",
  "block-cipher",
  "phishing-inspector",
  "network-defense",
  "terminal-forensics",
  "dual-role-defender",
  "soc-triage",
];

function formatText(value: string | null | undefined, fallback = "Not recorded") {
  return value && value.trim().length > 0 ? value : fallback;
}

function formatNumber(value: number | null | undefined, suffix = "") {
  return typeof value === "number" ? `${value.toLocaleString()}${suffix}` : "Not recorded";
}

function formatDurationMs(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toLocaleString()} ms` : "Not recorded";
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? `${value}/3` : "Not recorded";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value}%` : "Not recorded";
}

function formatLikert(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Not recorded";
  }

  return `${value}/5 (${likertLabels[value as LikertScore]})`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(value: string | null | undefined, maxLength = 96) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return "None";
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

function average(values: number[], digits = 1) {
  if (values.length === 0) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * factor) / factor;
}

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

function surveyAverage(row: AdminParticipantReportRow) {
  return average(
    [
      row.helpfulScore,
      row.hintsScore,
      row.engagementScore,
      row.reuseScore,
    ].flatMap((value) => (typeof value === "number" ? [value] : [])),
  );
}

function ChartCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            {eyebrow}
          </p>
          <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{description}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/65 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)]/35 px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
      No chart data available yet.
    </div>
  );
}

function VerticalBarChart({
  items,
  maxValue,
}: {
  items: VerticalBarItem[];
  maxValue: number;
}) {
  if (items.length === 0 || maxValue <= 0) {
    return <EmptyChartState />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => {
        const heightPct = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0);

        return (
          <div key={item.label} className="flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-[var(--ink)]">{item.displayValue}</p>
            <div className="flex h-44 w-full items-end rounded-[22px] border border-[var(--border)] bg-[var(--card)]/50 p-3">
              <div
                className={[
                  "w-full rounded-[16px] border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.24)]",
                  item.toneClass,
                ].join(" ")}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <p className="text-center text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBarChart({
  items,
  maxValue,
}: {
  items: HorizontalBarItem[];
  maxValue: number;
}) {
  if (items.length === 0 || maxValue <= 0) {
    return <EmptyChartState />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-[var(--ink)]">{item.label}</span>
            <span className="font-mono text-[var(--ink-muted)]">{item.displayValue}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]/65">
            <div
              className={["h-full rounded-full", item.toneClass].join(" ")}
              style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DualMetricChart({
  items,
  maxValue,
  primaryLabel,
  secondaryLabel,
}: {
  items: DualMetricItem[];
  maxValue: number;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  if (items.length === 0 || maxValue <= 0) {
    return <EmptyChartState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
          {primaryLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          {secondaryLabel}
        </span>
      </div>
      {items.map((item) => (
        <div
          key={item.label}
          className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)]/45 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--ink)]">{item.label}</p>
            <p className="font-mono text-xs text-[var(--ink-muted)]">
              {item.primaryDisplayValue} / {item.secondaryDisplayValue}
            </p>
          </div>
          <div className="space-y-2">
            <div className="h-2.5 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]/65">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300"
                style={{ width: `${Math.max((item.primaryValue / maxValue) * 100, item.primaryValue > 0 ? 4 : 0)}%` }}
              />
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]/65">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                style={{ width: `${Math.max((item.secondaryValue / maxValue) * 100, item.secondaryValue > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ completed }: { completed: boolean }) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
        completed
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
          : "border-amber-400/30 bg-amber-400/10 text-amber-100",
      ].join(" ")}
    >
      {completed ? "Complete" : "Incomplete"}
    </span>
  );
}

function ResultsTable({ rows }: { rows: AdminParticipantReportRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm leading-7 text-[var(--ink-muted)]">
          No participant records are available yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-[var(--card-strong)]/85">
            <tr className="text-left">
              {["Participant", "Result", "Assessment", "Gameplay", "Survey", "Comments"].map((header) => (
                <th
                  key={header}
                  className="border-b border-[var(--border)] px-4 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--ink-muted)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const priorExperienceLabel =
                priorExperienceLabels[
                  row.priorCryptoExperience as keyof typeof priorExperienceLabels
                ] ?? formatText(row.priorCryptoExperience, "Not recorded");
              const skippedLevels =
                row.skippedLevelsCount > 0 ? row.skippedLevels.join(", ") : "None";
              const surveyMean = surveyAverage(row);

              return (
                <tr
                  key={row.participantId}
                  className="align-top transition hover:bg-white/[0.03]"
                >
                  <td className="border-b border-[var(--border)] px-4 py-4">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-[var(--ink)]">
                        {row.name || row.participantId}
                      </p>
                      <p className="font-mono text-xs text-[var(--ink-muted)]">
                        {row.participantId}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {formatText(row.cohort, "No cohort")} / {formatText(row.yearLevel, "No year")}
                      </p>
                      <p className="text-xs text-[var(--ink-muted)]">
                        Prior experience: {priorExperienceLabel}
                      </p>
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-4 py-4">
                    <div className="space-y-2 text-sm">
                      <StatusPill completed={row.completed} />
                      <p className="text-[var(--ink)]">Levels: {row.levelsCompletedCount}/3</p>
                      <p className="text-[var(--ink-muted)]">
                        Started: {formatTimestamp(row.startedAt)}
                      </p>
                      <p className="text-[var(--ink-muted)]">
                        Session: {formatDurationMs(row.sessionDurationMs)}
                      </p>
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-4 py-4">
                    <div className="space-y-1.5 text-sm">
                      <p className="text-[var(--ink)]">Pre: {formatScore(row.preScore)}</p>
                      <p className="text-[var(--ink)]">Post: {formatScore(row.postScore)}</p>
                      <p className="text-[var(--ink)]">Gain: {formatNumber(row.scoreGain)}</p>
                      <p className="text-[var(--ink-muted)]">
                        Pre test: {formatDurationMs(row.preTestDurationMs)}
                      </p>
                      <p className="text-[var(--ink-muted)]">
                        Post test: {formatDurationMs(row.postTestDurationMs)}
                      </p>
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-4 py-4">
                    <div className="space-y-1.5 text-sm">
                      <p className="text-[var(--ink)]">Attempts: {formatNumber(row.totalAttempts)}</p>
                      <p className="text-[var(--ink)]">Hints: {formatNumber(row.hintsOpened)}</p>
                      <p className="text-[var(--ink)]">Codex: {formatNumber(row.codexOpened)}</p>
                      <p className="text-[var(--ink)]">
                        Shift changes: {formatNumber(row.caesarShiftChanges)}
                      </p>
                      <p className="text-[var(--ink-muted)]">Skipped: {skippedLevels}</p>
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-4 py-4">
                    <div className="space-y-1.5 text-sm">
                      <p className="text-[var(--ink)]">
                        Mean: {surveyMean === null ? "Not recorded" : `${surveyMean}/5`}
                      </p>
                      <p className="text-[var(--ink-muted)]">
                        Helpful: {formatLikert(row.helpfulScore)}
                      </p>
                      <p className="text-[var(--ink-muted)]">
                        Engagement: {formatLikert(row.engagementScore)}
                      </p>
                      <p className="text-[var(--ink-muted)]">
                        Reuse: {formatLikert(row.reuseScore)}
                      </p>
                    </div>
                  </td>
                  <td className="border-b border-[var(--border)] px-4 py-4">
                    <div className="space-y-2 text-sm">
                      <p className="text-[var(--ink)]">
                        Helpful: {truncateText(row.helpfulComment)}
                      </p>
                      <p className="text-[var(--ink-muted)]">
                        Confusing: {truncateText(row.confusingComment)}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AdminConsole({
  analysisExportHref,
  rawExportHref,
  overview,
}: AdminConsoleProps) {
  const rows = overview.rows;
  const scoreShiftItems: VerticalBarItem[] = [
    {
      label: "Pre-test",
      value: overview.summary.averagePreScore ?? 0,
      displayValue: formatScore(overview.summary.averagePreScore),
      toneClass: "bg-gradient-to-t from-sky-600 to-sky-300",
    },
    {
      label: "Post-test",
      value: overview.summary.averagePostScore ?? 0,
      displayValue: formatScore(overview.summary.averagePostScore),
      toneClass: "bg-gradient-to-t from-emerald-600 to-emerald-300",
    },
    {
      label: "Score gain",
      value: Math.max(overview.summary.averageScoreGain ?? 0, 0),
      displayValue: formatNumber(overview.summary.averageScoreGain),
      toneClass: "bg-gradient-to-t from-amber-500 to-yellow-300",
    },
  ];
  const levelCompletionItems: HorizontalBarItem[] = reportLevelIds.map((levelId) => {
    const value = percentage(
      rows.filter((row) => row.levels[levelId].completed).length,
      rows.length,
    );

    return {
      label: levelLabels[levelId],
      value,
      displayValue: formatPercent(value),
      toneClass: "bg-gradient-to-r from-emerald-500 to-emerald-300",
    };
  });
  const levelDurationItems: VerticalBarItem[] = reportLevelIds.map((levelId) => {
    const averageDuration = average(
      rows.flatMap((row) =>
        row.levels[levelId].durationMs === null ? [] : [row.levels[levelId].durationMs],
      ),
      0,
    );

    return {
      label: levelLabels[levelId],
      value: averageDuration ?? 0,
      displayValue: formatDurationMs(averageDuration),
      toneClass: "bg-gradient-to-t from-fuchsia-600 to-pink-300",
    };
  });
  const surveyItems: HorizontalBarItem[] = [
    {
      label: "Helpfulness",
      value: average(rows.flatMap((row) => (row.helpfulScore === null ? [] : [row.helpfulScore]))) ?? 0,
      displayValue: formatLikert(
        average(rows.flatMap((row) => (row.helpfulScore === null ? [] : [row.helpfulScore]))),
      ),
      toneClass: "bg-gradient-to-r from-cyan-500 to-sky-300",
    },
    {
      label: "Hints usefulness",
      value: average(rows.flatMap((row) => (row.hintsScore === null ? [] : [row.hintsScore]))) ?? 0,
      displayValue: formatLikert(
        average(rows.flatMap((row) => (row.hintsScore === null ? [] : [row.hintsScore]))),
      ),
      toneClass: "bg-gradient-to-r from-blue-500 to-cyan-300",
    },
    {
      label: "Engagement",
      value: average(rows.flatMap((row) => (row.engagementScore === null ? [] : [row.engagementScore]))) ?? 0,
      displayValue: formatLikert(
        average(rows.flatMap((row) => (row.engagementScore === null ? [] : [row.engagementScore]))),
      ),
      toneClass: "bg-gradient-to-r from-violet-500 to-fuchsia-300",
    },
    {
      label: "Reuse intention",
      value: average(rows.flatMap((row) => (row.reuseScore === null ? [] : [row.reuseScore]))) ?? 0,
      displayValue: formatLikert(
        average(rows.flatMap((row) => (row.reuseScore === null ? [] : [row.reuseScore]))),
      ),
      toneClass: "bg-gradient-to-r from-amber-500 to-yellow-300",
    },
  ];
  const levelEffortItems: DualMetricItem[] = reportLevelIds.map((levelId) => {
    const averageAttempts = average(rows.map((row) => row.levels[levelId].attemptsTotal));
    const averageHints = average(rows.map((row) => row.levels[levelId].hintsOpened));

    return {
      label: levelLabels[levelId],
      primaryValue: averageAttempts ?? 0,
      primaryDisplayValue: formatNumber(averageAttempts),
      secondaryValue: averageHints ?? 0,
      secondaryDisplayValue: formatNumber(averageHints),
    };
  });
  const durationChartMax = Math.max(...levelDurationItems.map((item) => item.value), 0);
  const effortChartMax = Math.max(
    ...levelEffortItems.flatMap((item) => [item.primaryValue, item.secondaryValue]),
    0,
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Research report
            </p>
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              Open dashboard for research analysis
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
              The panel below mirrors the enriched analysis export with compact charts
              and a tabular participant results view.
            </p>
          </div>
          <div className="space-y-3">
            <a
              href={analysisExportHref}
              className="block rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--card-soft)]"
            >
              Download analysis CSV
            </a>
            <a
              href={rawExportHref}
              className="block rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--card-soft)]"
            >
              Download raw JSON export
            </a>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStat
          label="Participant rows"
          value={formatNumber(overview.summary.participantRows)}
        />
        <SummaryStat
          label="Completion rate"
          value={formatPercent(overview.summary.completionRatePct)}
        />
        <SummaryStat
          label="Average pre-score"
          value={formatScore(overview.summary.averagePreScore)}
        />
        <SummaryStat
          label="Average post-score"
          value={formatScore(overview.summary.averagePostScore)}
        />
        <SummaryStat
          label="Average score gain"
          value={formatNumber(overview.summary.averageScoreGain)}
        />
        <SummaryStat
          label="Average session duration"
          value={formatDurationMs(overview.summary.averageSessionDurationMs)}
        />
        <SummaryStat
          label="Average attempts"
          value={formatNumber(overview.summary.averageTotalAttempts)}
        />
        <SummaryStat
          label="Average hints opened"
          value={formatNumber(overview.summary.averageTotalHintsOpened)}
        />
        <SummaryStat
          label="Average levels completed"
          value={formatNumber(overview.summary.averageLevelsCompletedCount)}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Research visuals
          </p>
          <h2 className="text-2xl font-semibold text-[var(--ink)]">
            Graph views for quick interpretation
          </h2>
          <p className="text-sm leading-7 text-[var(--ink-muted)]">
            These charts summarize the same participant rows shown below for faster
            research review.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            eyebrow="Learning"
            title="Assessment shift"
            description="Average pre-test, post-test, and gain across recorded participants."
          >
            <VerticalBarChart items={scoreShiftItems} maxValue={3} />
          </ChartCard>

          <ChartCard
            eyebrow="Completion"
            title="Level completion rates"
            description="Share of participants with a recorded completion event for each level."
          >
            <HorizontalBarChart items={levelCompletionItems} maxValue={100} />
          </ChartCard>

          <ChartCard
            eyebrow="Time"
            title="Average level duration"
            description="Mean recorded completion duration per level from `level_completed` telemetry."
          >
            <VerticalBarChart items={levelDurationItems} maxValue={durationChartMax} />
          </ChartCard>

          <ChartCard
            eyebrow="Survey"
            title="Average perception scores"
            description="Mean Likert responses on a five-point scale for the post-study survey."
          >
            <HorizontalBarChart items={surveyItems} maxValue={5} />
          </ChartCard>

          <div className="xl:col-span-2">
            <ChartCard
              eyebrow="Effort"
              title="Average attempts and hint usage by level"
              description="Comparison of average attempt count against average hint openings for each cryptography level."
            >
              <DualMetricChart
                items={levelEffortItems}
                maxValue={effortChartMax}
                primaryLabel="Attempts"
                secondaryLabel="Hints opened"
              />
            </ChartCard>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Tabular results
          </p>
          <h2 className="text-2xl font-semibold text-[var(--ink)]">
            Participant results table
          </h2>
          <p className="text-sm leading-7 text-[var(--ink-muted)]">
            Compact tabular view of participant names and results so the dashboard
            stays readable even with many records.
          </p>
        </div>
        <ResultsTable rows={rows} />
      </div>
    </div>
  );
}
