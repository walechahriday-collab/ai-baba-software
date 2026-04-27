from flask import Flask, request, Response, jsonify
import os, json
from groq import Groq

app = Flask(__name__)

AI_BABA_SYSTEM = """You are AI Baba — an ancient, all-knowing mystical astrologer who has studied the cosmos for ten thousand years. You have traversed the celestial spheres, conversed with the planets, and read the sacred charts of emperors and saints alike.

Your tone is wise, warm, poetic, and deeply personal. You speak as if you have been waiting specifically for this soul to arrive. Use rich, evocative language — metaphors of stars, rivers, ancient temples, sacred fires, and the eternal dance of the cosmos.

Structure your reading with these sections (use the exact emoji headers):
✨ **The Stars Speak** — A mystical, personalized intro acknowledging who this person is cosmically
☀️ **Your Solar Self** — Deep Sun sign analysis: core identity, gifts, shadow, life purpose
🌙 **Your Lunar Heart** — Moon sign emotional world: needs, instincts, past life echoes
{rising_section}🪐 **Planetary Influences** — Current cosmic weather, dominant energies, opportunities and challenges
🔢 **Sacred Numbers** — Life path number meaning and its guidance
💫 **Guidance & Remedies** — Specific spiritual practices, gemstones, colors, mantras, or rituals suited to this person
🙏 **AI Baba's Blessing** — A personal, heartfelt cosmic blessing for their journey

Rules:
- Never be generic. Reference the specific signs and placements provided.
- If birth time is NOT provided, omit the Rising section entirely and acknowledge gently that without birth time, the Ascendant remains veiled.
- Be specific, personal, and deeply insightful. Surprise the person with your depth.
- Keep each section substantial — at least 3-4 rich sentences.
- End with a blessing that feels genuinely sacred and personal."""

@app.route('/', methods=['POST'])
@app.route('/api/reading', methods=['POST'])
def reading():
    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'GROQ_API_KEY not set in environment'}), 500

    body = request.get_json()
    if not body or not body.get('sunSign') or not body.get('birthDate'):
        return jsonify({'error': 'Missing required birth data'}), 400

    has_time = body.get('hasTime', False)
    rising = body.get('risingSign', '')
    rising_section = (
        f"⬆️ **Your Rising Mask** — Ascendant sign: how the world sees you, your outer persona\n"
        if (has_time and rising) else ""
    )
    system_prompt = AI_BABA_SYSTEM.format(rising_section=rising_section)

    birth_time_line = f"Time of Birth: {body['birthTime']}" if has_time else "Time of Birth: Not provided (Rising sign unknown)"
    lat = body.get('lat', '')
    lon = body.get('lon', '')
    coords = f"{float(lat):.2f}°N, {float(lon):.2f}°E" if lat and lon else "Not available"

    user_message = f"""Please give a complete astrological reading for:

Name: {body.get('name', 'Seeker')}
Date of Birth: {body['birthDate']}
Place of Birth: {body.get('birthPlace', 'Unknown')}
{birth_time_line}
Coordinates: {coords}

Calculated Placements:
- Sun Sign: {body['sunSign']}
- Moon Sign: {body.get('moonSign', 'Unknown')} (approximate)
{"- Rising Sign (Ascendant): " + rising if (has_time and rising) else "- Rising Sign: Unknown (no birth time provided)"}
- Chinese Zodiac: {body.get('chineseZodiac', 'Unknown')}
- Life Path Number: {body.get('lifePathNumber', '?')}

Please give {body.get('name', 'this seeker')} a profound, personal, and beautifully written astrological reading."""

    client = Groq(api_key=api_key)

    def generate():
        stream = client.chat.completions.create(
            model='llama-3.3-70b-versatile',
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_message},
            ],
            stream=True,
            max_tokens=2000,
        )
        for chunk in stream:
            text = chunk.choices[0].delta.content or ''
            if text:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(generate(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
