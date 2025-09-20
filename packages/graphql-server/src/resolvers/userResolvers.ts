import { PrismaClient } from '@prisma/client';

// This would be the Prisma client for the remote (Postgres) database
const prisma = new PrismaClient();

export const userResolvers = {
  Query: {
    users: async () => {
      // In a real app, you'd handle errors and possibly pagination
      return await prisma.user.findMany();
    },
    user: async (_: any, { id }: { id: string }) => {
      return await prisma.user.findUnique({ where: { id } });
    },
  },
  Mutation: {
    createUser: async (_: any, { input }: { input: any }) => {
      return await prisma.user.create({
        data: input,
      });
    },
    updateUser: async (_: any, { id, input }: { id: string; input: any }) => {
      return await prisma.user.update({
        where: { id },
        data: input,
      });
    },
    deleteUser: async (_: any, { id }: { id:string }) => {
      return await prisma.user.delete({
        where: { id },
      });
    },
  },
};
