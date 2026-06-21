import { db } from '@/lib/db';
import { deleteImage } from '@/lib/r2';
import { uploads } from '@/lib/schema';
import { and, desc, asc, inArray, like, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(
      100,
      Number.parseInt(searchParams.get('limit') ?? '50', 10),
    );
    const offset = Math.max(
      0,
      Number.parseInt(searchParams.get('offset') ?? '0', 10),
    );

    const search = searchParams.get('search');
    const sort = searchParams.get('sort') ?? 'newest';

    const conditions = [];
    if (search) {
      conditions.push(like(uploads.fileName, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy = sort === 'oldest' ? asc(uploads.createdAt) : desc(uploads.createdAt);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(uploads)
      .where(whereClause);
    const total = countResult[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(uploads)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ uploads: rows, total });
  } catch (err) {
    console.error('[GET /api/uploads]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      uploadId?: number;
      uploadIds?: number[];
    };

    const ids: number[] = [];
    if (body.uploadIds?.length) {
      ids.push(...body.uploadIds);
    } else if (body.uploadId != null) {
      ids.push(body.uploadId);
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'uploadId or uploadIds is required' },
        { status: 400 },
      );
    }

    const rows = await db
      .select()
      .from(uploads)
      .where(inArray(uploads.id, ids));

    await Promise.allSettled(
      rows.map(async (row) => {
        try {
          const key = new URL(row.r2Url).pathname.slice(1);
          await deleteImage(key);
        } catch (err) {
          console.error(
            '[DELETE /api/uploads] R2 delete failed',
            row.r2Url,
            err,
          );
        }
      }),
    );

    await db.delete(uploads).where(inArray(uploads.id, ids));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/uploads]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
