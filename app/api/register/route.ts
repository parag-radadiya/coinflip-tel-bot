import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { id, first_name, last_name, username, language_code, is_premium, allows_write_to_pm, added_to_attachment_menu } = await req.json();

    const existingUser = await User.findOne({ telegramId: id });

    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const newUser = await User.create({
      telegramId: id,
      firstName: first_name,
      lastName: last_name,
      username: username,
      languageCode: language_code,
      isPremium: is_premium,
      allowsWriteToPm: allows_write_to_pm,
      addedToAttachmentMenu: added_to_attachment_menu,
      createdAt: new Date(),
      lastVisited: new Date(),
    });

    return NextResponse.json({ message: 'User registered successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ message: 'Error registering user' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const telegramId = req.nextUrl.searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json({ message: 'Missing telegramId' }, { status: 400 });
    }

    const existingUser = await User.findOne({ telegramId });

    return NextResponse.json({ exists: !!existingUser });
  } catch (error) {
    console.error('Error checking user existence:', error);
    return NextResponse.json({ message: 'Error checking user existence' }, { status: 500 });
  }
}
