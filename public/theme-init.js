try {
  const root = document.documentElement
  const storedMode = localStorage.getItem("zaati-theme")
  const dark = storedMode === "dark" || (storedMode !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
  root.classList.toggle("dark", dark)
  for (const [key, attribute] of [
    ["zaati-palette", "palette"],
    ["zaati-density", "density"],
    ["zaati-font", "font"],
    ["zaati-headings", "heading"],
  ]) {
    const value = localStorage.getItem(key)
    if (value) root.dataset[attribute] = value
  }
  const radius = localStorage.getItem("zaati-radius")
  if (radius) root.style.setProperty("--radius", radius)
} catch {}
