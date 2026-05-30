"use client";

import { useToast } from "@/lib/toast";

interface Props {
  id: string;
  className?: string;
}

export default function ContractIdBadge({ id, className = "" }: Props) {
  const { show } = useToast();

  function handleCopy() {
    navigator.clipboard.writeText(id).then(() => show("Copied!", "success"));
  }

  const truncated = `${id.slice(0, 6)}…${id.slice(-4)}`;

  return (
    <button
      onClick={handleCopy}
      title={id}
      aria-label={`Copy contract ID: ${id}`}
      className={`font-mono text-sm transition hover:opacity-80 ${className}`}
    >
      {truncated}
    </button>
  );
}
