"""
启动 Web 界面的脚本
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.web:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )



