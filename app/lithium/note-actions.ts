'use server';

import { getAuthenticatedClient } from "./auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Notes CRUD
// ---------------------------------------------------------------------------

/** Create a new note and return it */
export async function createNote(): Promise<Note> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: user.id, title: '', content: '' })
    .select()
    .single();

  if (error) {
    console.error('[note-actions] createNote DB error:', error);
    throw new Error('Failed to create note.');
  }
  
  return data as Note;
}

/** List all notes for the current user, newest first */
export async function listNotes(): Promise<Note[]> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, updated_at, is_pinned')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[note-actions] listNotes DB error:', error);
    throw new Error('Failed to load notes.');
  }
  
  return (data ?? []) as Note[];
}

/** Get a single note by ID */
export async function getNote(noteId: string): Promise<Note> {
  const { supabase, user } = await getAuthenticatedClient();

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('[note-actions] getNote DB error:', error);
    throw new Error('Note not found.');
  }
  
  return data as Note;
}

/** Update note */
export async function updateNote(noteId: string, updates: { title?: string; content?: string }): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[note-actions] updateNote DB error:', error);
    throw new Error('Failed to update note.');
  }
}

/** Update note pinned state */
export async function togglePinNote(noteId: string, isPinned: boolean): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('notes')
    .update({ is_pinned: isPinned })
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[note-actions] togglePinNote DB error:', error);
    throw new Error('Failed to update pin state.');
  }
}

/** Delete a note */
export async function deleteNote(noteId: string): Promise<void> {
  if (!noteId || noteId === 'null') return;

  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[note-actions] deleteNote DB error:', error);
    throw new Error('Failed to delete note.');
  }
}

/** Delete all notes for the current user */
export async function deleteAllNotes(): Promise<void> {
  const { supabase, user } = await getAuthenticatedClient();

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('[note-actions] deleteAllNotes DB error:', error);
    throw new Error('Failed to delete notes.');
  }
}
