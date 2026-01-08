// src/utils/adminAuth.ts
import type { User } from "firebase/auth";

// Replace this with your specific Admin Email(s)
const ADMIN_EMAILS = ['jenik.richter@gmail.com', 'hajkova.eva.ln@gmail.com'];

export const checkIsAdmin = (user: User | null): boolean => {
    if (!user || !user.email) return false;
    return ADMIN_EMAILS.includes(user.email);
};