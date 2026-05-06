"use client";
import { useEffect, useState } from "react";

export default function HydrationWrapper({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div style={{ visibility: "hidden" }}>{children}</div>;
  return <>{children}</>;
}