const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const nextToken = argv[i + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      args[key] = "true";
      continue;
    }
    args[key] = nextToken;
    i += 1;
  }
  return args;
}

function printUsageAndExit(message) {
  console.error(message);
  console.error("Usage:");
  console.error("  npm run bootstrap:admin -- --company-email <company@example.com> --password <password> [--email test@test.com] [--name \"Test Admin\"]");
  process.exit(1);
}

async function main() {
  const prisma = new PrismaClient();
  const args = parseArgs(process.argv);

  const email = (args.email || "test@test.com").trim().toLowerCase();
  const companyEmail = (args["company-email"] || "").trim().toLowerCase();
  const password = (args.password || "").trim();
  const name = (args.name || "Test Admin").trim();

  if (!companyEmail) {
    printUsageAndExit("Missing required argument: --company-email");
  }
  if (!password) {
    printUsageAndExit("Missing required argument: --password");
  }

  try {
    const company = await prisma.company.findUnique({
      where: { email: companyEmail },
      select: { id: true, name: true, email: true },
    });

    if (!company) {
      throw new Error(`Company with email ${companyEmail} was not found`);
    }

    const passwordHash = await hash(password, 12);

    const admin = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: passwordHash,
        name: name || email,
        role: "ADMIN",
        companyId: company.id,
      },
      update: {
        password: passwordHash,
        name: name || email,
        role: "ADMIN",
        companyId: company.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });

    console.log("Bootstrap admin completed:");
    console.log(JSON.stringify({ company, admin }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Bootstrap admin failed:", error.message);
  process.exit(1);
});
