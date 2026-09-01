import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { regatistaId } = await request.json();
    if (!regatistaId) {
      return NextResponse.json({ error: 'regatistaId is required' }, { status: 400 });
    }

    const existingLinkedUser = await prisma.user.findFirst({
      where: { regatistaId },
    });

    if (existingLinkedUser) {
      return NextResponse.json({ error: 'Regatista already linked to a user' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { regatistaId },
      select: {
        id: true,
        regatistaId: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error linking regatista:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
