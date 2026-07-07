import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const categories = [
  { id: "daily", label: "일상 게시판", description: "하루의 이야기와 생각을 나누는 공간" },
  { id: "health", label: "헬스", description: "운동 루틴, 식단, 회복 팁을 공유해요" },
  { id: "dev", label: "개발 게시판", description: "개발 기록과 질문을 정리하는 공간" },
];

const initialPosts = [
  {
    id: 101,
    categoryId: "daily",
    title: "오늘의 작은 기록",
    author: "관리자",
    createdAt: "2026.07.07",
    excerpt: "새 게시판에서 일상의 순간을 편하게 남겨보세요.",
    content: "사진과 글을 함께 올리고, 필요한 곳에는 그림판 메모도 남길 수 있습니다.",
  },
  {
    id: 102,
    categoryId: "health",
    title: "초보자를 위한 전신 루틴",
    author: "트레이너",
    createdAt: "2026.07.07",
    excerpt: "스쿼트, 푸시업, 플랭크를 중심으로 가볍게 시작합니다.",
    content: "운동 전후 스트레칭을 충분히 하고 자신의 컨디션에 맞춰 횟수를 조절하세요.",
  },
  {
    id: 103,
    categoryId: "dev",
    title: "React 게시판 에디터 메모",
    author: "개발자",
    createdAt: "2026.07.07",
    excerpt: "글꼴, 글자 크기, 이미지, 그림판 모드를 한 화면에서 다룹니다.",
    content: "네이버 블로그 에디터는 참고만 하고, 필요한 작성 기능을 이 프로젝트 스타일로 구현했습니다.",
  },
];

const fonts = [
  { label: "기본", value: "Arial, 'Noto Sans KR', sans-serif" },
  { label: "명조", value: "Georgia, 'Noto Serif KR', serif" },
  { label: "둥근", value: "'Trebuchet MS', 'Noto Sans KR', sans-serif" },
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

function BoardSidebar({ activeCategoryId, navigate }) {
  return (
    <aside className="board-sidebar" aria-labelledby="board-title">
      <div className="board-heading">
        <h1 id="board-title">게시판</h1>
      </div>
      <nav className="board-list" aria-label="게시판 세부 목록">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`board-list-item ${category.id === activeCategoryId ? "is-selected" : ""}`}
            type="button"
            onClick={() => navigate(`/boards/${category.id}`)}
          >
            <span>{category.label}</span>
            <small>{category.description}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function BlogLayout({ children, activeCategoryId, navigate }) {
  return (
    <div className="blog-page">
      <header className="blog-banner" aria-label="그림 배너">
        <img src={`${import.meta.env.BASE_URL}images/forest-banner.png`} alt="숲길 배경에 블로그 문구가 들어간 배너" />
      </header>
      <main className="blog-background">
        <div className="content-layout">
          <BoardSidebar activeCategoryId={activeCategoryId} navigate={navigate} />
          <div className="route-panel">{children}</div>
        </div>
      </main>
    </div>
  );
}

function BoardListPage({ category, posts, navigate }) {
  return (
    <section className="board-panel" aria-labelledby="board-page-title">
      <div className="board-panel-header">
        <div>
          <p className="eyebrow">게시판 세부 목록</p>
          <h2 id="board-page-title">{category.label}</h2>
          <p>{category.description}</p>
        </div>
        <button className="primary-button" type="button" onClick={() => navigate(`/boards/${category.id}/new`)}>
          게시판 생성
        </button>
      </div>

      <div className="post-list" aria-label={`${category.label} 글 목록`}>
        {posts.map((post) => (
          <button key={post.id} className="post-card" type="button" onClick={() => navigate(`/${post.id}`)}>
            <strong>{post.title}</strong>
            <span>{post.excerpt}</span>
            <small>{post.author} · {post.createdAt}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PostDetailPage({ post, navigate }) {
  return (
    <article className="board-panel post-detail">
      <button className="text-button" type="button" onClick={() => navigate(`/boards/${post.categoryId}`)}>← 목록으로</button>
      <h2>{post.title}</h2>
      <p className="post-meta">{post.author} · {post.createdAt}</p>
      <p>{post.content}</p>
    </article>
  );
}

function EditorPage({ category, onCreate, navigate }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fontFamily, setFontFamily] = useState(fonts[0].value);
  const [fontSize, setFontSize] = useState(18);
  const [image, setImage] = useState("");
  const [paintMode, setPaintMode] = useState(false);
  const [drawingSaved, setDrawingSaved] = useState("");

  useEffect(() => {
    if (!paintMode || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#111111";
  }, [paintMode]);

  function togglePaintMode() {
    if (paintMode && canvasRef.current) {
      const keep = window.confirm("그림판 모드를 끄면 그린 내용이 본문에 남습니다. 계속 남기겠습니까?");
      if (keep) setDrawingSaved(canvasRef.current.toDataURL("image/png"));
      else setDrawingSaved("");
    }
    setPaintMode((current) => !current);
  }

  function getPoint(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
  }

  function startDrawing(event) {
    const canvas = canvasRef.current;
    const point = getPoint(event);
    const context = canvas.getContext("2d");
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event) {
    if (!drawingRef.current) return;
    const context = canvasRef.current.getContext("2d");
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current.getContext("2d").closePath();
    if (canvasRef.current.hasPointerCapture(event.pointerId)) canvasRef.current.releasePointerCapture(event.pointerId);
  }

  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

  function submitPost() {
    if (!title.trim()) return;
    const id = Date.now();
    onCreate({ id, categoryId: category.id, title, author: "작성자", createdAt: new Date().toLocaleDateString("ko-KR"), excerpt: body.slice(0, 56) || "새 글입니다.", content: body });
    navigate(`/${id}`);
  }

  return (
    <section className="editor-page" aria-labelledby="editor-title">
      <div className="editor-topbar">
        <strong>N blog 참고 기능 에디터</strong>
        <div>
          <button className="text-button" type="button" onClick={() => navigate(`/boards/${category.id}`)}>취소</button>
          <button className="publish-button" type="button" onClick={submitPost}>발행</button>
        </div>
      </div>
      <div className="editor-toolbar" aria-label="작성 도구">
        <label>사진<input type="file" accept="image/*" onChange={handleImage} /></label>
        <label>글꼴<select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)}>{fonts.map((font) => <option key={font.label} value={font.value}>{font.label}</option>)}</select></label>
        <label>글자크기<input type="number" min="12" max="48" value={fontSize} onChange={(event) => setFontSize(event.target.value)} /></label>
        <button className={paintMode ? "tool-toggle is-on" : "tool-toggle"} type="button" onClick={togglePaintMode}>그림판 모드 {paintMode ? "끄기" : "켜기"}</button>
      </div>
      <div className="paper">
        <input id="editor-title" className="title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" />
        {image && <img className="attached-image" src={image} alt="첨부 미리보기" />}
        <textarea className="body-input" style={{ fontFamily, fontSize: `${fontSize}px` }} value={body} onChange={(event) => setBody(event.target.value)} placeholder="글을 입력하세요" />
        {paintMode && <canvas ref={canvasRef} className="inline-canvas" width="900" height="320" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} />}
        {!paintMode && drawingSaved && <img className="attached-image" src={drawingSaved} alt="그림판으로 작성한 그림" />}
      </div>
    </section>
  );
}

export default function App() {
  const { path, navigate } = usePath();
  const [posts, setPosts] = useState(initialPosts);
  const categoryFromPath = path.match(/^\/boards\/([^/]+)/)?.[1];
  const detailId = path.match(/^\/(\d+)/)?.[1];
  const activeCategoryId = categoryFromPath || posts.find((post) => String(post.id) === detailId)?.categoryId || "daily";
  const activeCategory = categories.find((category) => category.id === activeCategoryId) || categories[0];

  const page = useMemo(() => {
    if (path.endsWith("/new")) return <EditorPage category={activeCategory} onCreate={(post) => setPosts((current) => [post, ...current])} navigate={navigate} />;
    if (detailId) {
      const post = posts.find((item) => String(item.id) === detailId);
      return post ? <PostDetailPage post={post} navigate={navigate} /> : <BoardListPage category={activeCategory} posts={posts.filter((postItem) => postItem.categoryId === activeCategory.id)} navigate={navigate} />;
    }
    return <BoardListPage category={activeCategory} posts={posts.filter((post) => post.categoryId === activeCategory.id)} navigate={navigate} />;
  }, [activeCategory, detailId, navigate, path, posts]);

  return <BlogLayout activeCategoryId={activeCategory.id} navigate={navigate}>{page}</BlogLayout>;
}
