import { NextRequest, NextResponse } from 'next/server';
import { getAccounts, createAccount, deleteAccount } from '@/lib/db';

// GET /api/accounts — list all accounts
export async function GET() {
  try {
    const accounts = await getAccounts();
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/accounts — create account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id, account_name, currency, timezone } = body;
    if (!customer_id || !account_name) {
      return NextResponse.json(
        { error: 'customer_id and account_name are required' },
        { status: 400 }
      );
    }
    const account = await createAccount({ customer_id, account_name, currency, timezone });
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    const msg = String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: '该 Customer ID 已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/accounts?id=xxx
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await deleteAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
