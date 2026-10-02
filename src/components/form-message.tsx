import type { ActionState } from "@/actions/types";

export function FormMessage({ state }: { state: ActionState }) {
  if (state?.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state?.success) return <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>;
  return null;
}
