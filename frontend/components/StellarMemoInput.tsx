/**
 * frontend/components/StellarMemoInput.tsx
 *
 * Accessible input component for configuring Stellar transaction memos
 * with live byte counting and cryptographic hex validation.
 */

import React, { useId } from "react";
import {
  StellarMemoType,
  validateStellarMemo,
  getUtf8ByteLength,
} from "../utils/stellarMemoValidator";

export interface StellarMemoInputProps {
  memoType: StellarMemoType;
  memoValue: string;
  onChange: (type: StellarMemoType, value: string, isValid: boolean) => void;
  disabled?: boolean;
}

export const StellarMemoInput: React.FC<StellarMemoInputProps> = ({
  memoType,
  memoValue,
  onChange,
  disabled = false,
}) => {
  const generatedId = useId();
  const selectId = `${generatedId}-type`;
  const inputId = `${generatedId}-value`;
  const errorId = `${generatedId}-error`;

  const validation = validateStellarMemo(memoType, memoValue);
  const byteCount = getUtf8ByteLength(memoValue);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextType = e.target.value as StellarMemoType;
    const nextValidation = validateStellarMemo(nextType, memoValue);
    onChange(nextType, memoValue, nextValidation.isValid);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    const nextValidation = validateStellarMemo(memoType, nextVal);
    onChange(memoType, nextVal, nextValidation.isValid);
  };

  return (
    <div
      role="group"
      aria-label="Stellar Transaction Memo"
      className="w-full flex flex-col gap-2 font-sans"
    >
      <div className="flex justify-between items-center">
        <label htmlFor={selectId} className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Transaction Memo (Optional)
        </label>
        {memoType === "text" && (
          <span
            className={`text-[11px] font-mono ${
              byteCount > 28 ? "text-red-600 font-bold" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {byteCount} / 28 bytes
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <select
          id={selectId}
          value={memoType}
          disabled={disabled}
          onChange={handleTypeChange}
          aria-label="Memo Type"
          className="w-32 px-2.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="none">None</option>
          <option value="text">MEMO_TEXT</option>
          <option value="id">MEMO_ID</option>
          <option value="hash">MEMO_HASH</option>
          <option value="return">MEMO_RETURN</option>
        </select>

        {memoType !== "none" && (
          <div className="flex-1 relative">
            <input
              id={inputId}
              type="text"
              value={memoValue}
              disabled={disabled}
              onChange={handleValueChange}
              placeholder={
                memoType === "text"
                  ? "Max 28 bytes text..."
                  : memoType === "id"
                  ? "64-bit integer ID..."
                  : "64-character hex hash..."
              }
              aria-invalid={!validation.isValid}
              aria-describedby={!validation.isValid ? errorId : undefined}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 transition-colors ${
                !validation.isValid
                  ? "border-red-400 focus:ring-red-200 dark:bg-red-950/20"
                  : "border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-300"
              }`}
            />
          </div>
        )}
      </div>

      {!validation.isValid && validation.error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {validation.error}
        </p>
      )}
    </div>
  );
};
