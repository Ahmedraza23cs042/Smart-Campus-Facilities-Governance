import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlxapvzbyodtpudfntgy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VYa8c6V4LsNprZi8QSccsw_hbxqS2W7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);