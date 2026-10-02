import { Money } from '@saana/shared';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">SAANA RIDES</h1>
      <p className="mt-2 text-slate-600">Management dashboard (Phase 1 scaffold).</p>
      <p className="mt-4 text-sm text-slate-500">
        Money check: {Money.fromCedis('1234.5').format()}
      </p>
    </main>
  );
}
