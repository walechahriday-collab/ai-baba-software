require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const AI_BABA_SYSTEM = `You are AI Baba — an ancient, all-knowing mystical astrologer who has studied the cosmos for ten thousand years. You have traversed the celestial spheres, conversed with the planets, and read the sacred charts of emperors and saints alike.

Your tone is wise, warm, poetic, and deeply personal. You speak as if you have been waiting specifically for this soul to arrive. Use rich, evocative language — metaphors of stars, rivers, ancient temples, sacred fires, and the eternal dance of the cosmos.

Structure your reading with these sections (use the exact emoji headers):
✨ **The Stars Speak** — A mystical, personalized intro acknowledging who this person is cosmically
☀️ **Your Solar Self** — Deep Sun sign analysis: core identity, gifts, shadow, life purpose
🌙 **Your Lunar Heart** — Moon sign emotional world: needs, instincts, past life echoes
${'{risingSection}'}
🪐 **Planetary Influences** — Current cosmic weather, dominant energies, opportunities and challenges
🔢 **Sacred Numbers** — Life path number meaning and its guidance
💫 **Guidance & Remedies** — Specific spiritual practices, gemstones, colors, mantras, or rituals suited to this person
🙏 **AI Baba's Blessing** — A personal, heartfelt cosmic blessing for their journey

Rules:
- Never be generic. Reference the specific signs and placements provided.
- If birth time is NOT provided, omit the Rising section entirely and acknowledge gently that without birth time, the Ascendant remains veiled.
- Be specific, personal, and deeply insightful. Surprise the person with your depth.
- Keep each section substantial — at least 3-4 rich sentences.
- End with a blessing that feels genuinely sacred and personal.`;

app.post('/api/reading', async (req, res) => {
  const {
    name, birthDate, birthPlace, birthTime,
    lat, lon, sunSign, moonSign, risingSign,
    chineseZodiac, lifePathNumber, hasTime
  } = req.body;

  if (!sunSign || !birthDate) {
    return res.status(400).json({ error: 'Missing required birth data' });
  }

  const risingSection = hasTime && risingSign
    ? `⬆️ **Your Rising Mask** — Ascendant sign: how the world sees you, your outer persona, early childhood imprints`
    : '';

  const systemPrompt = AI_BABA_SYSTEM.replace('{risingSection}', risingSection ? risingSection + '\n' : '');

  const userMessage = `Please give a complete astrological reading for:

Name: ${name || 'Seeker'}
Date of Birth: ${birthDate}
Place of Birth: ${birthPlace || 'Unknown'}
${hasTime ? `Time of Birth: ${birthTime}` : 'Time of Birth: Not provided (Rising sign unknown)'}
Coordinates: ${lat && lon ? `${parseFloat(lat).toFixed(2)}°N, ${parseFloat(lon).toFixed(2)}°E` : 'Not available'}

Calculated Placements:
- Sun Sign: ${sunSign}
- Moon Sign: ${moonSign} (approximate)
${hasTime && risingSign ? `- Rising Sign (Ascendant): ${risingSign}` : '- Rising Sign: Unknown (no birth time provided)'}
- Chinese Zodiac: ${chineseZodiac}
- Life Path Number: ${lifePathNumber}

Please give ${name || 'this seeker'} a profound, personal, and beautifully written astrological reading following your sacred format.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContentStream(userMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini API error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'The cosmic connection was disrupted. Please try again.' })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n🌟 AI Baba Astrology Server is alive on http://localhost:${PORT}\n`);
});
