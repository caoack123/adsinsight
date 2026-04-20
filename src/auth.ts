/**
 * NextAuth v5 (Auth.js) configuration
 * Google OAuth → upserts user into Supabase user_profiles on first login
 *
 * v5 env vars:
 *   AUTH_SECRET         (not NEXTAUTH_SECRET)
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createServerClient } from '@/lib/supabase';

export const { handlers, auth, signIn, signOut } = NextAuth({
  // trustHost lets NextAuth work on Vercel/custom domains without NEXTAUTH_URL
  trustHost: true,

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
        // First login: upsert user profile into Supabase
        const db = createServerClient();
        await db.from('user_profiles').upsert(
          {
            google_id:  profile.sub,
            email:      profile.email,
            name:       profile.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            avatar_url: (profile as any).picture ?? null,
          },
          { onConflict: 'google_id' },
        );

        const { data } = await db
          .from('user_profiles')
          .select('id')
          .eq('google_id', profile.sub!)
          .single();

        token.userId    = data?.id ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.avatarUrl = (profile as any).picture ?? null;
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
});
