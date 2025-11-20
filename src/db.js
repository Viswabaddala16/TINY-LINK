import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default {
  createLink: (code, url) =>
    prisma.link.create({ data: { code, url } }),

  getByCode: (code) =>
    prisma.link.findUnique({ where: { code } }),

  listAll: () =>
    prisma.link.findMany({ orderBy: { id: 'desc' } }),

  deleteByCode: (code) =>
    prisma.link.delete({ where: { code } }),

  incrementClick: (code) =>
    prisma.link.update({
      where: { code },
      data: { clicks: { increment: 1 }, last_clicked: new Date() }
    })
};
