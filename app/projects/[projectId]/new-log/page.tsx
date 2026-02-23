export default function NewLogPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6">New Daily Log</h1>
      <form className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" className="w-full p-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weather</label>
            <input type="text" className="w-full p-2 border border-gray-300 rounded" placeholder="e.g. Sunny, 15°C" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Work Description</label>
          <textarea className="w-full p-2 border border-gray-300 rounded h-32" placeholder="Describe the work done today..."></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Crew / Resources</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded" placeholder="e.g. 5 workers, 1 excavator" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Photos</label>
          <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center text-gray-500">
            Click or drag to upload photos
          </div>
        </div>
        <button type="button" className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700">
          Save Log
        </button>
      </form>
    </div>
  );
}