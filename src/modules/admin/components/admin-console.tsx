import { likertLabels, priorExperienceLabels } from "@/config/study";
import { Card } from "@/components/ui/card";
import type {
  AdminAssessmentAnswerReport,
  AdminLevelReport,
  AdminOverview,
  AdminParticipantReportRow,
} from "@/modules/admin/server";
import type { AssessmentItemId, LevelId, LikertScore } from "@/types/study";

interface AdminConsoleProps {
  analysisExportHref: string;
  rawExportHref: string;
  overview: AdminOverview;
}

const assessmentLabels: Record<AssessmentItemId, string> = {
  "caesar-basics": "Caesar basics",
  "xor-alignment": "XOR alignment",
  "block-key-iv": "Block cipher key/IV",
};

const levelLabels: Record<LevelId, string> = {
  "caesar-cipher": "Caesar cipher",
  "xor-stream": "XOR stream",
  "block-cipher": "Block cipher",
};

const reportLevelIds: LevelId[] = [
  "caesar-cipher",
  "xor-stream",
  "block-cipher",
];

const assessmentItemIds: AssessmentItemId[] = [
  "caesar-basics",
  "xor-alignment",
  "block-key-iv",
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

function formatList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None";
}

function formatLikert(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "Not recorded";
  }

  return `${value}/5 (${likertLabels[value as LikertScore]})`;
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? `${value}/3` : "Not recorded";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${value}%` : "Not recorded";
}

function formatResearchValue(
  answer: AdminAssessmentAnswerReport,
  emptyLabel = "No response",
) {
  if (!answer.answer) {
    return emptyLabel;
  }

  if (answer.correct === null) {
    return answer.answer;
  }

  return `${answer.answer} (${answer.correct ? "correct" : "incorrect"})`;
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent-strong)]">
        {eyebrow}
      </p>
      <h3 className="text-lg font-semibold text-[var(--ink)]">{title}</h3>
    </div>
  );
}

function ReportField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/55 px-4 py-3">
      <dt className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
        {label}
      </dt>
      <dd className="mt-2 text-sm leading-6 text-[var(--ink)]">{value}</dd>
    </div>
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

function AssessmentBlock({
  itemId,
  row,
}: {
  itemId: AssessmentItemId;
  row: AdminParticipantReportRow;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/55 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
        {assessmentLabels[itemId]}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ReportField
          label="Pre-test answer"
          value={formatResearchValue(row.assessments.pre[itemId])}
        />
        <ReportField
          label="Post-test answer"
          value={formatResearchValue(row.assessments.post[itemId])}
        />
      </div>
    </div>
  );
}

function LevelReport({
  levelId,
  level,
}: {
  levelId: LevelId;
  level: AdminLevelReport;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/55 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent-strong)]">
            {levelLabels[levelId]}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {level.completed
              ? "Completed"
              : level.skipped
                ? "Skipped"
                : "No completion event recorded"}
          </p>
        </div>
        <div
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
            level.completed
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : level.skipped
                ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                : "border-[var(--border-strong)] bg-[var(--card-strong)] text-[var(--ink-muted)]",
          ].join(" ")}
        >
          {level.completed ? "Completed" : level.skipped ? "Skipped" : "Open"}
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ReportField label="Started at" value={formatText(level.startedAt)} />
        <ReportField label="Ended at" value={formatText(level.endedAt)} />
        <ReportField label="Time spent" value={formatDurationMs(level.durationMs)} />
        <ReportField label="Attempts" value={formatNumber(level.attemptsTotal)} />
        <ReportField label="Failed attempts" value={formatNumber(level.attemptsFailed)} />
        <ReportField
          label="Successful attempts"
          value={formatNumber(level.attemptsSucceeded)}
        />
        <ReportField label="Hints opened" value={formatNumber(level.hintsOpened)} />
        <ReportField label="Codex opens" value={formatNumber(level.codexOpened)} />
        <ReportField
          label="Codex entries viewed"
          value={formatList(level.codexEntriesViewed)}
        />
      </dl>
    </div>
  );
}

function ParticipantReport({ row }: { row: AdminParticipantReportRow }) {
  const priorExperienceLabel =
    priorExperienceLabels[
      row.priorCryptoExperience as keyof typeof priorExperienceLabels
    ] ?? formatText(row.priorCryptoExperience, "Not recorded");

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Participant report
          </p>
          <h3 className="text-2xl font-semibold text-[var(--ink)]">
            {row.name ? `${row.name} (${row.participantId})` : row.participantId}
          </h3>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            Session {formatText(row.sessionId)}. Research snapshot for the latest recorded
            session linked to this participant.
          </p>
        </div>
        <div
          className={[
            "rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]",
            row.completed
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : "border-amber-400/30 bg-amber-400/10 text-amber-100",
          ].join(" ")}
        >
          {row.completed ? "Session complete" : "Session incomplete"}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <SectionTitle eyebrow="Session" title="Participant and environment" />
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReportField label="Cohort" value={formatText(row.cohort)} />
            <ReportField label="Year level" value={formatText(row.yearLevel)} />
            <ReportField label="Prior experience" value={priorExperienceLabel} />
            <ReportField label="Consent accepted" value={row.consentAccepted ? "Yes" : "No"} />
            <ReportField label="Started at" value={formatText(row.startedAt)} />
            <ReportField label="Ended at" value={formatText(row.endedAt)} />
            <ReportField
              label="Session duration"
              value={formatDurationMs(row.sessionDurationMs)}
            />
            <ReportField label="Viewport" value={formatText(row.viewport)} />
            <ReportField label="Device type" value={formatText(row.deviceType)} />
            <ReportField label="Input type" value={formatText(row.inputType)} />
            <ReportField label="Browser" value={formatText(row.browserFamily)} />
            <ReportField label="Operating system" value={formatText(row.osFamily)} />
          </dl>
        </section>

        <section className="space-y-4">
          <SectionTitle eyebrow="Outcomes" title="Assessment and learning change" />
          <dl className="grid gap-3 sm:grid-cols-2">
            <ReportField label="Pre-test score" value={formatScore(row.preScore)} />
            <ReportField label="Post-test score" value={formatScore(row.postScore)} />
            <ReportField label="Score gain" value={formatNumber(row.scoreGain)} />
            <ReportField
              label="Levels completed"
              value={`${row.levelsCompletedCount}/3`}
            />
            <ReportField
              label="Pre-test started"
              value={formatText(row.preTestStartedAt)}
            />
            <ReportField
              label="Pre-test submitted"
              value={formatText(row.preTestSubmittedAt)}
            />
            <ReportField
              label="Pre-test duration"
              value={formatDurationMs(row.preTestDurationMs)}
            />
            <ReportField
              label="Post-test started"
              value={formatText(row.postTestStartedAt)}
            />
            <ReportField
              label="Post-test submitted"
              value={formatText(row.postTestSubmittedAt)}
            />
            <ReportField
              label="Post-test duration"
              value={formatDurationMs(row.postTestDurationMs)}
            />
          </dl>
          <div className="grid gap-3">
            {assessmentItemIds.map((itemId) => (
              <AssessmentBlock key={itemId} itemId={itemId} row={row} />
            ))}
          </div>
        </section>

        <section className="space-y-4 xl:col-span-2">
          <SectionTitle eyebrow="Telemetry" title="Gameplay interaction report" />
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportField label="Total events" value={formatNumber(row.totalEvents)} />
            <ReportField label="Total attempts" value={formatNumber(row.totalAttempts)} />
            <ReportField label="Hints opened" value={formatNumber(row.hintsOpened)} />
            <ReportField label="Codex opens" value={formatNumber(row.codexOpened)} />
            <ReportField
              label="Failed attempts"
              value={formatNumber(row.attemptsFailed)}
            />
            <ReportField
              label="Successful attempts"
              value={formatNumber(row.attemptsSucceeded)}
            />
            <ReportField
              label="Caesar shift changes"
              value={formatNumber(row.caesarShiftChanges)}
            />
            <ReportField
              label="Skipped levels"
              value={row.skippedLevelsCount > 0 ? formatList(row.skippedLevels) : "None"}
            />
            <ReportField
              label="All codex entries viewed"
              value={formatList(row.codexEntriesViewed)}
            />
          </dl>
          <div className="grid gap-4">
            {reportLevelIds.map((levelId) => (
              <LevelReport key={levelId} levelId={levelId} level={row.levels[levelId]} />
            ))}
          </div>
        </section>

        <section className="space-y-4 xl:col-span-2">
          <SectionTitle eyebrow="Survey" title="Perception and qualitative feedback" />
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportField label="Helpfulness" value={formatLikert(row.helpfulScore)} />
            <ReportField label="Hints usefulness" value={formatLikert(row.hintsScore)} />
            <ReportField label="Engagement" value={formatLikert(row.engagementScore)} />
            <ReportField label="Reuse intention" value={formatLikert(row.reuseScore)} />
          </dl>
          <div className="grid gap-3 xl:grid-cols-2">
            <ReportField
              label="Helpful comment"
              value={formatText(row.helpfulComment, "No comment")}
            />
            <ReportField
              label="Confusing comment"
              value={formatText(row.confusingComment, "No comment")}
            />
          </div>
        </section>
      </div>
    </Card>
  );
}

export function AdminConsole({
  analysisExportHref,
  rawExportHref,
  overview,
}: AdminConsoleProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Research report
            </p>
            <h2 className="text-2xl font-semibold text-[var(--ink)]">
              Structured admin view for participant-level analysis
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
              The panel below now mirrors the enriched analysis export: assessment answers,
              timing, per-level telemetry, survey data, and session-level derived metrics.
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
            Participant reports
          </p>
          <h2 className="text-2xl font-semibold text-[var(--ink)]">
            Latest session report for each participant
          </h2>
          <p className="text-sm leading-7 text-[var(--ink-muted)]">
            Every card below is built from the same row model used by the analysis CSV,
            so the on-screen report and exported dataset stay aligned.
          </p>
        </div>

        {overview.rows.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm leading-7 text-[var(--ink-muted)]">
              No participant records are available yet.
            </p>
          </Card>
        ) : (
          overview.rows.map((row) => <ParticipantReport key={row.participantId} row={row} />)
        )}
      </div>
    </div>
  );
}
