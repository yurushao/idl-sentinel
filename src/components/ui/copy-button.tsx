"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const copiedButtonClassName =
  "bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 dark:hover:text-green-100";

interface CopyButtonProps extends Omit<
  ButtonProps,
  "aria-label" | "asChild" | "children" | "onClick"
> {
  value: string;
  copyLabel?: string;
  copiedLabel?: string;
  copiedDuration?: number;
  onCopied?: () => void;
  onCopyError?: (error: unknown) => void;
}

export function CopyButton({
  value,
  copyLabel = "Copy",
  copiedLabel = "Copied",
  copiedDuration = 1800,
  className,
  title,
  onCopied,
  onCopyError,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeout.current) {
        clearTimeout(resetTimeout.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      onCopyError?.(error);
      return;
    }

    setCopied(true);
    onCopied?.();

    if (resetTimeout.current) {
      clearTimeout(resetTimeout.current);
    }

    resetTimeout.current = setTimeout(() => {
      setCopied(false);
      resetTimeout.current = null;
    }, copiedDuration);
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      className={cn(className, copied && copiedButtonClassName)}
      aria-label={copied ? copiedLabel : copyLabel}
      title={copied ? copiedLabel : (title ?? copyLabel)}
      {...props}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
