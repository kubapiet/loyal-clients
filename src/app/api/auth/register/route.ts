import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, address } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nazwa, email i hasło są wymagane" },
        { status: 400 }
      );
    }

    const existing = await prisma.company.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Firma z tym adresem email już istnieje" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const company = await prisma.company.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        address: address || null,
      },
    });

    return NextResponse.json(
      { id: company.id, name: company.name, email: company.email },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas rejestracji" },
      { status: 500 }
    );
  }
}
