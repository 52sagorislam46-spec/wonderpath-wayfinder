import { signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import {
  collection,
  deleteField,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

/** Admin sets a new password for a member; applied on the member's next login. */
export async function adminSetPassword(uid: string, newPassword: string) {
  await updateDoc(doc_(uid), { pendingPassword: newPassword });
}

function doc_(uid: string) {
  // local helper to avoid name clash
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require_doc(uid);
}
import { doc } from "firebase/firestore";
function require_doc(uid: string) {
  return doc(db, "users", uid);
}

/**
 * If the admin set a new password for this email and the typed password matches it,
 * sign in with the previous password and switch the account to the new one.
 */
export async function loginWithAdminSetPassword(email: string, typed: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, "users"), where("email", "==", email.trim()), limit(1)),
  );
  const d = snap.docs[0];
  if (!d) return false;
  const data = d.data() as { pendingPassword?: string; adminPassword?: string };
  if (!data.pendingPassword || data.pendingPassword !== typed || !data.adminPassword) return false;
  const cred = await signInWithEmailAndPassword(auth, email, data.adminPassword);
  await updatePassword(cred.user, typed);
  await updateDoc(d.ref, { adminPassword: typed, pendingPassword: deleteField() });
  return true;
}
