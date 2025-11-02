/**
 * LogConsole - Component for displaying execution logs
 * @param {Object} props - Component props
 * @param {Array<string>} props.lines - Array of log line strings
 */
function LogConsole({ lines = [] }) {
    return (
        <div style={{
            padding: '20px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            backgroundColor: '#282c34',
            color: '#abb2bf',
            minHeight: '300px',
            maxHeight: '600px',
            overflowY: 'auto',
            fontFamily: "'Courier New', monospace",
            fontSize: '14px',
            lineHeight: '1.6'
        }}>
            {lines.length === 0 ? (
                <div style={{
                    color: '#5c6370',
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '40px 20px'
                }}>
                    Execution logs will appear here…
                </div>
            ) : (
                <div>
                    {lines.map((line, index) => (
                        <div
                            key={index}
                            style={{
                                padding: '4px 0',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}
                        >
                            {line}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LogConsole;

