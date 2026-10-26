#!/usr/bin/env python3
"""Genera r/<n>/index.html para cada receta: vista previa (Open Graph) y redirección a /app/?r=<n>. Uso: python3 scripts/build-recipe-pages.py"""
import html, json, os, shutil
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
D = os.path.join(ROOT, "app/data")
load = lambda f: json.load(open(os.path.join(D, f), encoding="utf-8"))
nums = load("recipe-numbers.json")
tr_es = load("recipes-tr-es.json")
rec = {}
for l in ["es", "en", "pt", "fr", "it", "de"]:
    for r in load(f"recipes-{l}.json"):
        rec.setdefault(r["id"], (l, r))
out = os.path.join(ROOT, "r")
shutil.rmtree(out, ignore_errors=True)
for i, n in nums.items():
    if i not in rec:
        continue
    l, r = rec[i]
    t = tr_es.get(i) if l != "es" else None
    title = (t or r).get("title") or r["title"]
    summ = (t or r).get("summary") or r.get("summary") or ""
    has = os.path.exists(os.path.join(ROOT, "app/photos", i + ".webp"))
    img = f"https://vencito.app/app/photos/{i}.webp" if has else "https://vencito.app/app/icons/icon-512.png"
    e = html.escape
    page = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} · Vencito</title>
<meta name="description" content="{e(summ)}">
<link rel="canonical" href="https://vencito.app/r/{n}/">
<meta property="og:type" content="article"><meta property="og:site_name" content="Vencito">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(summ)}">
<meta property="og:url" content="https://vencito.app/r/{n}/"><meta property="og:image" content="{e(img)}">
<meta name="robots" content="noindex"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=/app/?r={n}">
</head><body><p><a href="/app/?r={n}">{e(title)}</a></p><script>location.replace('/app/?r={n}'+location.hash)</script></body></html>
"""
    os.makedirs(os.path.join(out, str(n)), exist_ok=True)
    open(os.path.join(out, str(n), "index.html"), "w", encoding="utf-8").write(page)
print(len(os.listdir(out)), "páginas")
