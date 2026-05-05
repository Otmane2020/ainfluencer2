import { useEffect } from "react";

export default function Demo2Page() {
  useEffect(() => {
    window.location.replace("/demo2.html");
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#06080A" }}>
      <iframe
        src="/demo2.html"
        title="ClipMotion Demo"
        style={{ width: "100%", height: "100vh", border: 0 }}
      />
    </div>
  );
}
