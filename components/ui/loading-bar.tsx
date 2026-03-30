export function LoadingBar() {
  return (
    <>
      <style>{`
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-loading-bar {
          animation: loadingBar 1.5s infinite linear;
        }
      `}</style>
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary/20 overflow-hidden z-50">
        <div className="h-full bg-primary w-1/2 animate-loading-bar" />
      </div>
    </>
  );
}
