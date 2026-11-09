/**
 * frontend/components/StellarAddressInput.tsx
 *
 * Accessible input component with cryptographic Stellar address validation and type badges.
 */

import React, { useId } from "react";
import { validateStellarAccount, AddressValidationResult } from "../utils/stellarAccountValidator";

export interface StellarAddressInputProps {
  value: string;
  onChange: (value: string, validation: AddressValidationResult) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export const StellarAddressInput: React.FC<StellarAddressInputProps> = ({
  value,
  onChange,
  placeholder = "G... or user*domain.com",
  label = "Stellar Recipient Address",
  id: externalId,
  disabled = false,
}) => {
  const generatedId = useId();
  const inputId = externalId || generatedId;
  const errorId = `${inputId}-error`;
  const badgeId = `${inputId}-badge`;

  const validation = validateStellarAccount(value);
  const hasValue = value.trim().length > 0;
  const isInvalid = hasValue && !validation.isValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    const nextValidation = validateStellarAccount(nextVal);
    onChange(nextVal, nextValidation);
  };

  return (
    <div className="w-full flex flex-col gap-1.5 font-sans">
      <div className="flex justify-between items-center">
        <label htmlFor={inputId} className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </label>
        {hasValue && validation.isValid && (
          <span
            id={badgeId}
            className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
          >
            {validation.type.toUpperCase()}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? errorId : badgeId}
          className={`w-full px-3.5 py-2.5 rounded-lg border text-sm font-mono transition-colors focus:outline-none focus:ring-2 ${
            isInvalid
              ? "border-red-400 focus:ring-red-200 dark:border-red-600 dark:bg-red-950/20"
              : "border-gray-300 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900" : ""}`}
        />
      </div>

      {isInvalid && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {validation.error}
        </p>
      )}
    </div>
  );
};
