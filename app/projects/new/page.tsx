export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6">Create New Project</h1>
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project Name</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded" placeholder="e.g. City Center Plaza" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded" placeholder="e.g. Alexanderplatz 1" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <input type="text" className="w-full p-2 border border-gray-300 rounded" placeholder="e.g. BuildCorp GmbH" />
        </div>
        <button type="button" className="bg-orange-600 text-white px-6 py-2 rounded hover:bg-orange-700">
          Create Project
        </button>
      </form>
    </div>
  );
}