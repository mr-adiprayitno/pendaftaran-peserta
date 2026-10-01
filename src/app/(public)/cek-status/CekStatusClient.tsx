"use client";

import { useActionState } from "react";
import { checkRegistrationStatus } from "@/actions";
import type { VerifyState } from "@/lib/shared";
import StatusResult from "./StatusResult";

const initial: VerifyState = { ok: false, message: "" };

export default function CekStatusClient() {
  const [state, action, pending] = useActionState(checkRegistrationStatus, initial);

  return (
    <div className="space-y-6">
      <form action={action} className="flex flex-col gap-3 sm:flex-row">
        <input
          name="checkCode"
          type="text"
          required
          placeholder="cth: PSRT-A1B2C3D4"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Kode peserta"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Mencari..." : "Cek Status"}
        </button>
      </form>

      {state.message && !state.ok ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.ok && state.data ? <StatusResult data={state.data} /> : null}
    </div>
  );
}