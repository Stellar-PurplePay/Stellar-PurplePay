import React from "react";

export interface TimelineMilestone {
  id: number;
  title: string;
  percentage: number;
  amount: number | string;
  approved: boolean;
  completedAt?: number;
}

export interface EscrowTimelineStepperProps {
  milestones: TimelineMilestone[];
  activeMilestoneId?: number;
  onSelectMilestone?: (id: number) => void;
  tokenSymbol?: string;
}

export const EscrowTimelineStepper: React.FC<EscrowTimelineStepperProps> = ({
  milestones,
  activeMilestoneId,
  onSelectMilestone,
  tokenSymbol = "XLM",
}) => {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        No milestones configured for this escrow contract.
      </div>
    );
  }

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const releasedPercentage = milestones
    .filter((m) => m.approved)
    .reduce((sum, m) => sum + m.percentage, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header and Progress Bar */}
      <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Milestone Progression</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {releasedPercentage}% Released ({milestones.filter((m) => m.approved).length} of {milestones.length} milestones)
          </p>
        </div>
        <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {releasedPercentage}% / {totalPercentage}%
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          role="progressbar"
          aria-valuenow={releasedPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, releasedPercentage))}%` }}
        />
      </div>

      {/* Stepper items list */}
      <ol className="mt-6 space-y-4">
        {milestones.map((m, idx) => {
          const isSelected = activeMilestoneId === m.id;
          const numericAmount = typeof m.amount === "string" ? parseFloat(m.amount) : m.amount;

          return (
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <li
              key={m.id}
              onClick={() => onSelectMilestone && onSelectMilestone(m.id)}
              onKeyDown={(e) => {
                if (onSelectMilestone && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelectMilestone(m.id);
                }
              }}
              className={`flex items-start gap-4 rounded-lg p-3 transition ${
                onSelectMilestone ? "cursor-pointer" : ""
              } ${
                isSelected
                  ? "border border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/20"
                  : "border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              aria-current={isSelected ? "step" : undefined}
            >
              {/* Step Icon / Number Indicator */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  m.approved
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : isSelected
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {m.approved ? "✓" : idx + 1}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {m.title}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tokenSymbol} ({m.percentage}%)
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      m.approved
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : isSelected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {m.approved ? "Released" : isSelected ? "In Progress" : "Pending"}
                  </span>
                  {m.completedAt && (
                    <span className="text-[11px] text-gray-400">
                      Settled: {new Date(m.completedAt * 1000).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

