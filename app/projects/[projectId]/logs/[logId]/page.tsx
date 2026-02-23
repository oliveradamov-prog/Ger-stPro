export default function LogDetailsPage({ params }: { params: { projectId: string, logId: string } }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Daily Log #{params.logId}</h1>
            <p className="text-gray-600">Feb 23, 2026 • Project {params.projectId}</p>
          </div>
          <button className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 border border-gray-300">
            Export PDF (Placeholder)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-8 border-t pt-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Weather</h3>
            <p className="text-lg">Cloudy, 8°C</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase">Crew</h3>
            <p className="text-lg">4 Workers, 1 Site Manager</p>
          </div>
        </div>
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Work Description</h3>
          <p className="text-lg leading-relaxed">
            Placeholder work description. Foundation pouring for the west wing completed. 
            Excavation for utility lines started. All safety protocols followed.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="aspect-square bg-gray-200 rounded flex items-center justify-center text-gray-400 italic">Photo Placeholder</div>
            <div className="aspect-square bg-gray-200 rounded flex items-center justify-center text-gray-400 italic">Photo Placeholder</div>
          </div>
        </div>
      </div>
    </div>
  );
}