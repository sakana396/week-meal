/** まだ作っていない画面の仮の表示（#26 の段階。#27〜#29、#34 で置き換える） */
export function PlaceholderScreen({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="screen-stack" aria-label={`${label}画面`}>
      <header className="screen-header">
        <div>
          <p className="food-id">{label}</p>
          <h2>{title}</h2>
        </div>
      </header>
      <section className="notice-panel">
        <p>この画面は準備中です。</p>
      </section>
      {children}
    </div>
  );
}
