"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const codeLength = 6;

type VerificationCodeProps = {
  label: string;
  digitLabel: string;
  readOnly: boolean;
  errorId?: string;
  onComplete: (code: string) => void;
};

export function VerificationCode({ label, digitLabel, readOnly, errorId, onComplete }: VerificationCodeProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(codeLength).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function enterDigits(index: number, text: string) {
    const inserted = text.replace(/\D/g, "").slice(0, codeLength);
    if (text && !inserted) return;

    const start = inserted.length === codeLength ? 0 : index;
    const next = [...digits];
    if (!inserted) next[index] = "";
    else next.splice(start, Math.min(inserted.length, codeLength - start), ...inserted.slice(0, codeLength - start));
    setDigits(next);

    if (next.every(Boolean)) {
      onComplete(next.join(""));
    } else if (inserted) {
      inputs.current[Math.min(start + inserted.length, codeLength - 1)]?.focus();
    }
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      inputs.current[Math.max(0, index - 1)]?.focus();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      inputs.current[Math.min(codeLength - 1, index + 1)]?.focus();
    } else if (event.key === "Backspace" && !readOnly && !digits[index] && index > 0) {
      event.preventDefault();
      enterDigits(index - 1, "");
      inputs.current[index - 1]?.focus();
    }
  }

  return (
    <div role="group" aria-label={label} className="mx-auto grid w-full max-w-[25rem] grid-cols-6 gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputs.current[index] = element; }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={codeLength}
          aria-label={`${digitLabel} ${index + 1}`}
          aria-invalid={Boolean(errorId)}
          aria-describedby={errorId}
          value={digit}
          readOnly={readOnly}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => enterDigits(index, event.target.value)}
          onKeyDown={(event) => handleKey(event, index)}
          onPaste={(event) => {
            event.preventDefault();
            if (!readOnly) enterDigits(index, event.clipboardData.getData("text"));
          }}
          className="h-13 w-full min-w-0 rounded-s border border-white/40 bg-black/10 text-center text-m tabular-nums outline-none focus:border-primary aria-invalid:border-red-300"
        />
      ))}
    </div>
  );
}
