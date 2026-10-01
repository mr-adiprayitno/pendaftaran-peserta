"use client";

import { useActionState } from "react";
import { adminLogin } from "@/actions";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, {});

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-neutral-900">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-900">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Memproses..." : "Masuk"}
      </button>
      <p className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-600">
        Demo: username <code className="font-mono">admin</code> / password{" "}
        <code className="font-mono">admin123</code>
      </p>
    </form>
  );
}