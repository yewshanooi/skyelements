'use server';

import { createActionClient } from "@/utils/supabase/actions";
import { redirect } from "next/navigation";

type ActionState = {
    error?: string;
    success?: boolean;
}

export async function login(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const supabase = await createActionClient();

    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    const captchaToken = String(formData.get('captchaToken') || '')
    
    const {error} = await supabase.auth.signInWithPassword({email, password, options: { captchaToken }});

    if (error) {
        return { error: error.message };
    }

    redirect('/lithium')
}

export async function signup(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const supabase = await createActionClient();

    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    const captchaToken = String(formData.get('captchaToken') || '')

    const {error} = await supabase.auth.signUp({email, password, options: { captchaToken }});

    if (error) {
        return { error: error.message };
    }

    redirect('/lithium')
}

export async function forgotPassword(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const supabase = await createActionClient();

    const email = String(formData.get('email') || '');
    const captchaToken = String(formData.get('captchaToken') || '');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
        captchaToken,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function resetPassword(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
    const supabase = await createActionClient();

    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (password !== confirmPassword) {
        return { error: 'Passwords do not match.' };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function signout() {
    const supabase = await createActionClient();

    await supabase.auth.signOut();

    redirect('/')
}