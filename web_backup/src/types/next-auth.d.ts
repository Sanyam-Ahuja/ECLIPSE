import "next-auth";

declare module "next-auth" {
  interface Session {
    backend_jwt?: string;
  }
}
