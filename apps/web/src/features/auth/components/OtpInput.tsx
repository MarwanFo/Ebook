import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  length?: number;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  length = 6,
  autoFocus = true,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of characters padded to length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Extract only digits
    const cleanDigits = rawVal.replace(/\D/g, '');

    if (!cleanDigits) {
      // Empty input
      const newDigits = [...digits];
      newDigits[index] = '';
      const newVal = newDigits.join('');
      onChange(newVal);
      return;
    }

    if (cleanDigits.length > 1) {
      // User pasted into a single box
      handlePasteString(cleanDigits);
      return;
    }

    const singleDigit = cleanDigits.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    const newVal = newDigits.join('');
    onChange(newVal);

    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }

    // Auto-focus next input
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move focus backward and delete previous digit
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newVal = newDigits.join('');
        onChange(newVal);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePasteString = (pasted: string) => {
    const clean = pasted.replace(/\D/g, '').slice(0, length);
    if (!clean) return;

    onChange(clean);

    if (clean.length === length && onComplete) {
      onComplete(clean);
    }

    // Focus last filled box or next empty box
    const focusIndex = Math.min(clean.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    handlePasteString(pastedData);
  };

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3 my-2"
      role="group"
      aria-label="6-digit verification code"
    >
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-border bg-surface text-center font-mono text-xl sm:text-2xl font-bold text-text shadow-xs transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
};
