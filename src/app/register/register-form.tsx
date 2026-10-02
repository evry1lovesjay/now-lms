"use client";

import { useActionState } from "react";
import { register } from "@/actions/auth";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

export function RegisterForm() {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input className="input" id="name" name="name" autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
      </div>
      <SubmitButton pendingText="Creating account…">Create student account</SubmitButton>
    </form>
  );
}
