"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/src/lib/auth/auth0";
import { ensureConversation } from "@/src/lib/conversations/repository";
import { sanitizeUid } from "@/src/lib/uid";

/**
 * Server action: ensure a 1:1 conversation exists between the signed-in user
 * and `otherUid`, then redirect to its thread page. Used by the "Send
 * message" affordance on profile pages.
 */
export async function openConversationAction(
  formData: FormData,
): Promise<void> {
  const otherUid = formData.get("otherUid");
  if (typeof otherUid !== "string" || otherUid.length === 0) {
    throw new Error(
      `[openConversationAction] form is missing required field 'otherUid'`,
    );
  }
  const session = await auth0.getSession();
  if (!session?.user?.sub) {
    throw new Error(
      `[openConversationAction] no Auth0 session; sign in at /auth/sign-in`,
    );
  }
  const myUid = sanitizeUid(session.user.sub);
  const convId = await ensureConversation(myUid, otherUid);
  redirect(`/messages/${convId}`);
}
