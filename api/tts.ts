import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { text, lang } = req.query;
  if (!text || typeof text !== "string") {
    return res.status(400).send("Text parameter is required");
  }

  const langCode = (typeof lang === "string" ? lang : "de").split("-")[0].toLowerCase();
  const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(text)}`;

  try {
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return res.status(500).send("TTS Upstream Service Error");
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(500).send("Error generating TTS audio");
  }
}