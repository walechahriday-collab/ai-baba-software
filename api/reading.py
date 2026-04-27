from http.server import BaseHTTPRequestHandler
import json, os
import anthropic

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


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not api_key:
            self._json(500, {'error': 'ANTHROPIC_API_KEY not configured on server'})
            return

        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))

        if not body.get('sunSign') or not body.get('birthDate'):
            self._json(400, {'error': 'Missing required birth data'})
            return

        has_time = body.get('hasTime', False)
        rising = body.get('risingSign', '')
        rising_section = (
            "⬆️ **Your Rising Mask** — Ascendant sign: how the world sees you, your outer persona\n"
            if (has_time and rising) else ""
        )
        system = AI_BABA_SYSTEM.format(rising_section=rising_section)

        name = body.get('name', 'Seeker')
        lat = body.get('lat', '')
        lon = body.get('lon', '')
        coords = f"{float(lat):.2f}°N, {float(lon):.2f}°E" if lat and lon else "Not available"
        birth_time_line = f"Time of Birth: {body['birthTime']}" if has_time else "Time of Birth: Not provided (Rising sign unknown)"

        user_msg = f"""Please give a complete astrological reading for:

Name: {name}
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

Please give {name} a profound, personal, and beautifully written astrological reading."""

        try:
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=2000,
                system=system,
                messages=[{'role': 'user', 'content': user_msg}]
            )
            self._json(200, {'text': message.content[0].text})
        except Exception as e:
            self._json(500, {'error': str(e)})

    def _json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass
