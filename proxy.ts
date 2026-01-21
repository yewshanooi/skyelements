import { NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

export async function proxy(request: NextRequest) {
    return updateSession(request);
}

export const config = {
    matcher: ['/(.*)']
};
