import Link from "next/link";

export default function ProjectDetailsPage({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Project {params.projectId}</h1>
          <p className="text-gray-600">Daily Logs</p>
        </div>
        <Link href={`/projects/${params.projectId}/new-log`} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
          New Daily Log
        </Link>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((logId) => (
          <Link key={logId} href={`/projects/${params.projectId}/logs/${logId}`} className="block bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-600 transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-500 text-sm">Feb 23, 2026</span>
                <h3 className="text-lg font-bold">Work Description Placeholder {logId}</h3>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}