/**
 * NextAuth v5 (Auth.js) configuration
 * Google OAuth → upserts user into Supabase user_profiles on first login
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createServerClient } from '@/lib/supabase';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    // Runs on every sign-in and token refresh
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // First login: upsert user profile in Supabase
        const db = createServerClient();
        await db.from('user_profiles').upsert(
          {
            google_id:  profile.sub,
            email:      profile.email,
            name:       profile.name,
            avatar_url: (profile as Record<string, unknown>).picture as string ?? null,
          },
          { onConflict: 'google_id' },
        );
        const { data } = await db
          .from('user_profiles')
          .select('id')
          .eq('google_id', profile.sub!)
          .single();

        token.userId    = data?.id ?? null;
        token.avatarUrl = (profile as Record<string, unknown>).picture ?? null;
      }
      return token;
    },

    // Expose userId + avatar on the client-side session object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      session.userId    = token.userId    ?? null;
      session.avatarUrl = token.avatarUrl ?? null;
      return session;
    },
  },

  pages: {
    // No custom sign-in page — we use a popup/redirect inline
  },
});
