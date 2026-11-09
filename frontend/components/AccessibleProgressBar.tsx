import React from "react";

export interface AccessibleProgressBarProps {
  value: number;
  max?: number;
  label: string;
  showPercentage?: boolean;
  highContrast?: boolean;
  color?: "emerald" | "indigo" | "amber" | "purple";
  ariaLive?: "polite" | "assertive" | "off";
  className?: string;
}

const COLOR_MAP = {
  emerald: {
    bar: "bg-emerald-600 dark:bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  indigo: {
    bar: "bg-indigo-600 dark:bg-indigo-500",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  amber: {
    bar: "bg-amber-600 dark:bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  purple: {
    bar: "bg-purple-600 dark:bg-purple-500",
    text: "text-purple-700 dark:text-purple-300",
  },
};

export const AccessibleProgressBar: React.FC<AccessibleProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  highContrast = false,
  color = "emerald",
  ariaLive = "polite",
  className = "",
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const colorStyle = COLOR_MAP[color] || COLOR_MAP.emerald;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between text-xs font-medium mb-1">
        <span id={`progress-label-${label.replace(/\s+/g, "-")}`} className="text-gray-700 dark:text-gray-300">
          {label}
        </span>
        {showPercentage && (
          <span
            className={`font-mono font-bold ${colorStyle.text}`}
            aria-hidden="true"
          >
            {percentage}%
          </span>
        )}
      </div>

      <div
        className={`h-3 w-full overflow-hidden rounded-full ${
          highContrast
            ? "border-2 border-black bg-white dark:border-white dark:bg-gray-900"
            : "bg-gray-100 dark:bg-gray-700"
        }`}
      >
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-labelledby={`progress-label-${label.replace(/\s+/g, "-")}`}
          aria-valuetext={`${percentage} percent completed`}
          className={`h-full rounded-full transition-all duration-300 ${colorStyle.bar} ${
            highContrast ? "pattern-contrast" : ""
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {ariaLive !== "off" && (
        <span className="sr-only" aria-live={ariaLive}>
          {label}: {percentage}% completed
        </span>
      )}
    </div>
  );
};
