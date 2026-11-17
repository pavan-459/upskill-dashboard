import { connection } from "next/server";
import { Suspense } from "react";
import { prisma } from "@/lib/db";

// Placeholder until the student UI lands (session 2). Proves the DB wiring end to end.
// Cache Components is on: uncached DB reads run at request time behind <Suspense>.

async function LearnerList() {
  await connection();
  const learners = await prisma.learner.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <p className="mt-1 text-sm text-neutral-600">Scaffold is up. {learners.length} learners seeded.</p>
      <ul className="mt-4 list-disc pl-5">
        {learners.map((l) => (
          <li key={l.id}>{l.name}</li>
        ))}
      </ul>
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4">
      <h1 className="text-2xl font-semibold">Upskill</h1>
      <Suspense fallback={<p className="mt-1 text-sm text-neutral-600">Loading learners…</p>}>
        <LearnerList />
      </Suspense>
    </main>
  );
}
