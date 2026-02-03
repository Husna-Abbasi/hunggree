import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// import { SupabaseAdapter } from "@auth/supabase-adapter"; // install if needed

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    // Optional: Adapter to sync with Supabase
    // adapter: SupabaseAdapter({
    //   url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    // }),
    callbacks: {
        async session({ session, token }: any) {
            if (session?.user) {
                session.user.id = token.sub; // Add ID to session
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/login',
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
