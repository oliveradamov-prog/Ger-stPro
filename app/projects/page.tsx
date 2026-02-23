import Link from "next/link";

export default function ProjectsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Link href="/projects/new" className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
          New Project
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((id) => (
          <div key={id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-2">Sample Project {id}</h2>
            <p className="text-gray-600 mb-4">Location: Berlin, Germany</p>
            <Link href={`/projects/${id}`} className="text-orange-600 font-medium hover:underline">
              View Daily Logs →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}