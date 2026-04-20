import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    userId:    string | null;
    avatarUrl: string | null;
  }
}
