import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageClient } from "./page-client";
import { signout } from "@/lib/actions/auth";
import { getUserProfile } from "@/lib/profile";
import { listNotes, getNote, type Note } from "./note-actions";

export const metadata: Metadata = {
  title: "Notes",
  description: "Note-taking app with rich markdown editor and seamless organisation.",
};

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/?auth=login&redirectTo=/notes");
  }

  const user = getUserProfile(authUser);

  let initialNotes: Note[] | undefined = undefined;
  let initialActiveNote: Note | null = null;

  try {
    initialNotes = await listNotes();
    if (initialNotes.length > 0) {
      initialActiveNote = await getNote(initialNotes[0].id);
    }
  } catch (error) {
    console.error("[notes/page] Failed to load initial notes:", error);
    initialNotes = undefined;
  }

  return (
    <PageClient
      user={user}
      signout={signout}
      initialNotes={initialNotes}
      initialActiveNote={initialActiveNote}
    />
  );
}
