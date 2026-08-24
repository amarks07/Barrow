const APK_VERSION = "1.3.1";

export default function Page() {
  return (
    <main
      className="font min-h-screen flex flex-col items-center px-6 py-16"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="w-full max-w-[420px] flex flex-col items-center text-center">
        <img
          src="/icon-512.png"
          alt=""
          width={96}
          height={96}
          style={{ borderRadius: 20, border: "1.5px solid var(--line-strong)" }}
        />
        <h1 className="display mt-5" style={{ fontSize: 40, color: "var(--text)" }}>
          BARROW
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--text-dim)" }}>
          A calendar-based workout tracker — supersets, templates, progressive-overload
          recommendations, and history charts, all logged in a few taps.
        </p>

        <a
          href="https://github.com/amarks07/Barrow/releases/latest/download/barrow.apk"
          download
          className="pill w-full mt-8 py-3.5 text-[15px] font-bold text-center"
          style={{ background: "var(--accent)", color: "#121214" }}
        >
          Download for Android
        </a>
        <p className="mt-3 text-[12px]" style={{ color: "var(--text-dim)" }}>
          Direct install — no Play Store required. Version {APK_VERSION}.
        </p>

        <div className="card w-full mt-10 p-5 text-left">
          <h2 className="display text-[16px] mb-3" style={{ color: "var(--text)" }}>
            Installing on Android
          </h2>
          <p className="text-[12px] mb-3" style={{ color: "var(--text-dim)" }}>
            Samsung phones only — skip this if you're not on a Galaxy device: open{" "}
            <strong style={{ color: "var(--text)" }}>
              Settings &gt; Security and privacy &gt; Auto Blocker
            </strong>{" "}
            and turn it off before downloading. Auto Blocker prevents installing apps from outside
            the Play Store and Galaxy Store, so it will block this install while it's on. You can
            turn it back on afterward.
          </p>
          <ol className="text-[13px] flex flex-col gap-2" style={{ color: "var(--text-dim)" }}>
            <li>1. Tap the download button above from your phone's browser.</li>
            <li>
              2. Android may warn that the file type can be harmful, or that Play Protect doesn't
              recognize the app. Tap{" "}
              <strong style={{ color: "var(--text)" }}>More details</strong>, then{" "}
              <strong style={{ color: "var(--text)" }}>Install anyway</strong>.
            </li>
            <li>
              3. If asked to allow installs from this source, tap{" "}
              <strong style={{ color: "var(--text)" }}>Settings</strong> and allow installs from
              this app (usually your browser or Files app), then go back and tap Install.
            </li>
            <li>4. Reopen the downloaded file and tap Install.</li>
          </ol>
          <p className="mt-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
            Exact wording can vary by phone and Android version — look for a way to bypass the
            warning ("more details," "install anyway," or similar) rather than the exact phrase
            above.
          </p>
        </div>

        <p className="mt-10 text-[11px]" style={{ color: "var(--text-dim)" }}>
          Barrow is distributed directly by its developer, not through the Play Store — that's why
          Android shows an unfamiliar-source warning during install. On iPhone, visiting this site
          opens the installable web app version directly.
        </p>
      </div>
    </main>
  );
}
