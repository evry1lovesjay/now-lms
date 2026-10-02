"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "@/actions/users";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export function CreateUserForm({ roles }: { roles: readonly Role[] }) {
  const [state, action] = useActionState(createUser, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Temporary password</label>
        <input className="input" id="password" name="password" type="text" minLength={8} required />
      </div>
      <div>
        <label className="label" htmlFor="role">Role</label>
        <select className="input" id="role" name="role" defaultValue={roles.includes("TUTOR") ? "TUTOR" : roles[0]}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton pendingText="Adding…">Add user</SubmitButton>
      <div className="sm:col-span-2 lg:col-span-5">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
