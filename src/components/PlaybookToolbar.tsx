function PlaybookToolbar() {
    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Playbook Builder</h2>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
                        Save
                    </button>
                    <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition">
                        Dry-run
                    </button>
                    <button className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PlaybookToolbar;




