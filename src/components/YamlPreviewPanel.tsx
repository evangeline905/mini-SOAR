function YamlPreviewPanel() {
    const sampleYaml = `rules:
  - name: sample_rule
    if:
      severity: High
    then:
      - action: firewall_block_ip
        params:
          ip_field: src_ip`;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">YAML Preview</h3>
            <div className="bg-gray-900 rounded p-4 mb-4">
                <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                    <code>{sampleYaml}</code>
                </pre>
            </div>
            <div className="mt-4">
                <h4 className="text-md font-semibold mb-2 text-gray-700">Dry-run Results</h4>
                <div className="bg-gray-50 rounded p-3 border border-gray-200">
                    <p className="text-sm text-gray-600">Dry-run results placeholder</p>
                </div>
            </div>
        </div>
    );
}

export default YamlPreviewPanel;





