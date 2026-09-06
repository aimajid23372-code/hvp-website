import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">HVB Next.js Migration Started</h1>
      <p className="mb-8">This is the new Next.js structure. The admin panel and Supabase backend are currently being implemented.</p>
      <div className="flex gap-4">
        <Link href="/admin/dashboard" className="px-4 py-2 bg-accent-teal text-bg-primary rounded-lg font-bold">Admin Dashboard</Link>
        <Link href="/course-bundle" className="px-4 py-2 bg-accent-violet text-bg-primary rounded-lg font-bold">View Courses</Link>
      </div>
    </main>
  );
}