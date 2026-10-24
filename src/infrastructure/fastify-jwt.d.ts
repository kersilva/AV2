import type { PapelUsuario } from "@/generated/prisma/enums.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; usuario: string; papel: PapelUsuario };
    user: { sub: string; usuario: string; papel: PapelUsuario };
  }
}
