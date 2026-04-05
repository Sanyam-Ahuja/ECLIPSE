import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && account.id_token) {
        try {
          // Replace trailing slashes but preserve the path logic
          let baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
          
          // Force HTTPS for production
          if (baseUrl.includes("sslip.io") || baseUrl.includes("34.100.183.146")) {
            baseUrl = baseUrl.replace("http://", "https://");
          }
          
          baseUrl = baseUrl.replace(/\/+$/, ""); // Normalized
          const res = await fetch(`${baseUrl}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ google_token: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            // Store the backend JWT in the NextAuth account object temporarily
            account.backend_jwt = data.access_token;
            return true;
          }
        } catch (e) {
          console.error("Failed to authenticate with backend", e);
        }
      }
      return true; // Fallback for local testing if backend isn't up
    },
    async jwt({ token, account }) {
      // Persist the backend JWT to the token right after signin
      if (account?.backend_jwt) {
        token.backend_jwt = account.backend_jwt;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.backend_jwt) {
        session.backend_jwt = token.backend_jwt as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
