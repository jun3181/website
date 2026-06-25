import { useCallback, useEffect, useRef, useState } from "react";

const items = [
  { id: 1, label: "목록 1" },
  { id: 2, label: "목록 2" },
  { id: 3, label: "목록 3" },
];

const tools = [
  { id: "brush", label: "브러쉬", shortcut: "B" },
  { id: "eraser", label: "지우개", shortcut: "E" },
  { id: "text", label: "텍스트", shortcut: "T" },
];

function usePath() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  return { path, navigate };
}

function HomePage({ navigate }) {
  const [selectedId, setSelectedId] = useState(1);
  const selectedItem = items.find((item) => item.id === selectedId);

  function selectItem(item) {
    if (item.id === 1) {
      navigate("/draw");
      return;
    }

    setSelectedId(item.id);
  }

  return (
    <main className="page">
      <section className="site-frame" aria-label="사이트 기본 구조">
        <header className="banner">
          <img
            src="/images/banner-focus.png"
            alt="분홍색 방에서 쉬고 있는 캐릭터 배너"
          />
        </header>

        <div className="content-frame">
          <nav className="list-panel" aria-label="목록">
            {items.map((item) => (
              <button
                key={item.id}
                className={`list-item ${
                  item.id === selectedId ? "is-selected" : ""
                }`}
                type="button"
                onClick={() => selectItem(item)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <section className="update-panel" aria-live="polite">
            <h1>업데이트</h1>
            <p>{selectedItem.label} 내용이 표시될 공간</p>
          </section>
        </div>
      </section>
    </main>
  );
}

function DrawingPage({ navigate }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const historyRef = useRef([]);
  const textInputRef = useRef(null);
  const [tool, setTool] = useState("brush");
  const [brushSize, setBrushSize] = useState(8);
  const [pendingText, setPendingText] = useState(null);
  const [canUndo, setCanUndo] = useState(false);

  const prepareContext = useCallback((context, selectedTool) => {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = selectedTool === "eraser" ? "#ffffff" : "#111111";
    context.fillStyle = "#111111";
    context.lineWidth = brushSize;
  }, [brushSize]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    historyRef.current.push(
      context.getImageData(0, 0, canvas.width, canvas.height),
    );

    if (historyRef.current.length > 20) {
      historyRef.current.shift();
    }

    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const previousImage = historyRef.current.pop();
    if (!canvas || !previousImage) return;

    canvas.getContext("2d").putImageData(previousImage, 0, 0);
    setCanUndo(historyRef.current.length > 0);
    setPendingText(null);
    canvas.focus();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    textInputRef.current?.focus();
  }, [pendingText]);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if (isTyping) return;

      const shortcut = event.key.toLowerCase();
      if (shortcut === "b") {
        setPendingText(null);
        setTool("brush");
      }
      if (shortcut === "e") {
        setPendingText(null);
        setTool("eraser");
      }
      if (shortcut === "t") setTool("text");

      if (
        (tool === "brush" || tool === "eraser") &&
        event.code === "BracketLeft"
      ) {
        event.preventDefault();
        setBrushSize((currentSize) => Math.max(2, currentSize - 2));
      }

      if (
        (tool === "brush" || tool === "eraser") &&
        event.code === "BracketRight"
      ) {
        event.preventDefault();
        setBrushSize((currentSize) => Math.min(60, currentSize + 2));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tool, undo]);

  function getCanvasPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDrawing(event) {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);
    canvas.focus();

    if (tool === "text") {
      const frameRect = canvas.parentElement.getBoundingClientRect();
      setPendingText({
        canvasX: point.x,
        canvasY: point.y,
        displayX: event.clientX - frameRect.left,
        displayY: event.clientY - frameRect.top,
        value: "",
      });
      return;
    }

    saveHistory();
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    prepareContext(context, tool);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.1, point.y + 0.1);
    context.stroke();
  }

  function draw(event) {
    if (!drawingRef.current || tool === "text") return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);

    prepareContext(context, tool);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event) {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.closePath();

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    saveHistory();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    setPendingText(null);
    canvas.focus();
  }

  function selectTool(nextTool) {
    setPendingText(null);
    setTool(nextTool);
  }

  function commitText() {
    const value = pendingText?.value.trim();
    if (!value) {
      setPendingText(null);
      canvasRef.current?.focus();
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    saveHistory();
    prepareContext(context, "text");
    context.font = "40px Arial, sans-serif";
    context.textBaseline = "top";
    context.fillText(value, pendingText.canvasX, pendingText.canvasY);
    setPendingText(null);
    canvas.focus();
  }

  function handleTextKeyDown(event) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      commitText();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setPendingText(null);
      canvasRef.current?.focus();
    }
  }

  function exportPng() {
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.download = `drawing-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return (
    <main className="drawing-page">
      <section className="drawing-app" aria-label="그림판">
        <header className="drawing-header">
          <button
            className="back-button"
            type="button"
            onClick={() => navigate("/")}
          >
            ← 목록으로
          </button>
          <div>
            <h1>그림판</h1>
            <p>도구 버튼을 누르거나 B, E, T 키를 사용하세요.</p>
          </div>
        </header>

        <div className="toolbar" aria-label="그림 도구">
          <div className="tool-buttons">
            {tools.map((item) => (
              <button
                key={item.id}
                className={`tool-button ${
                  tool === item.id ? "is-active" : ""
                }`}
                type="button"
                aria-pressed={tool === item.id}
                onClick={() => selectTool(item.id)}
              >
                <kbd>{item.shortcut}</kbd>
                {item.label}
              </button>
            ))}
          </div>

          {(tool === "brush" || tool === "eraser") && (
            <span className="brush-size" aria-live="polite">
              크기 {brushSize}px
              <small>[ 작게 · ] 크게</small>
            </span>
          )}

          <div className="toolbar-actions">
            <button
              className="undo-button"
              type="button"
              disabled={!canUndo}
              onClick={undo}
            >
              실행 취소
              <small>Ctrl+Z</small>
            </button>
            <button
              className="clear-canvas-button"
              type="button"
              onClick={clearCanvas}
            >
              전체 지우기
            </button>
            <button className="export-button" type="button" onClick={exportPng}>
              PNG 내보내기
            </button>
          </div>
        </div>

        <div className="canvas-frame">
          <canvas
            ref={canvasRef}
            className={`drawing-canvas tool-${tool}`}
            width="1200"
            height="720"
            tabIndex="0"
            aria-label="빈 그림판"
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onPointerLeave={stopDrawing}
          />
          {pendingText && (
            <input
              ref={textInputRef}
              className="canvas-text-input"
              type="text"
              maxLength="40"
              aria-label="캔버스 텍스트 입력"
              placeholder="입력 후 Enter"
              value={pendingText.value}
              style={{
                left: pendingText.displayX,
                top: pendingText.displayY,
              }}
              onChange={(event) =>
                setPendingText((currentText) => ({
                  ...currentText,
                  value: event.target.value,
                }))
              }
              onKeyDown={handleTextKeyDown}
            />
          )}
        </div>

        <p className="drawing-help" aria-live="polite">
          현재 도구: {tools.find((item) => item.id === tool)?.label}
          {tool === "text" &&
            " — 캔버스를 클릭하고 글자를 입력한 뒤 Enter를 누르세요."}
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const { path, navigate } = usePath();

  if (path === "/draw") {
    return <DrawingPage navigate={navigate} />;
  }

  return <HomePage navigate={navigate} />;
}
