import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "company-login",
      name: "Company Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const company = await prisma.company.findUnique({
          where: { email: credentials.email },
        });

        if (!company) return null;

        const isValid = await compare(credentials.password, company.password);
        if (!isValid) return null;

        return {
          id: company.id,
          email: company.email,
          name: company.name,
          role: "COMPANY",
          companyId: company.id,
        };
      },
    }),
    CredentialsProvider({
      id: "employee-login",
      name: "Employee Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        });

        if (!user) return null;

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
          companyId: user.companyId,
        };
      },
    }),
    CredentialsProvider({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        const magicLink = await prisma.magicLink.findUnique({
          where: { token: credentials.token },
        });

        if (!magicLink) return null;
        if (magicLink.used) return null;
        if (magicLink.expiresAt < new Date()) return null;

        await prisma.magicLink.update({
          where: { id: magicLink.id },
          data: { used: true },
        });

        const card = await prisma.loyaltyCard.findUnique({
          where: { id: magicLink.cardId },
        });

        if (!card) return null;

        return {
          id: card.id,
          email: card.email,
          name: `${card.firstName} ${card.lastName}`,
          role: "CUSTOMER",
          companyId: card.companyId,
          cardId: card.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.cardId = (user as any).cardId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).cardId = token.cardId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret-change-in-production",
};
