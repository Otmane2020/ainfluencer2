"""
Traduit le texte en français et génère des légendes TikTok engageantes.
Utilise Claude si ANTHROPIC_API_KEY est défini, sinon deep-translator (gratuit).
"""
import os
from dotenv import load_dotenv

load_dotenv()

EMO_HASHTAGS = (
    "#EMORobot #RobotIA #RobotFrançais #EMO #LivingAi "
    "#RobotMignon #IntelligenceArtificielle #TechFR #RobotCute #RobotPetFR"
)

CAPTION_TEMPLATES = [
    "🤖 {text}\n\n{hashtags}",
    "✨ {text}\n\n{hashtags}",
    "💡 {text}\n\n{hashtags}",
    "🎉 {text}\n\n{hashtags}",
    "🔥 {text}\n\n{hashtags}",
]

_template_index = 0


def translate_and_caption(original_text: str, source_lang: str = "en") -> str:
    """
    Traduit le texte en français et génère une légende TikTok.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()

    if api_key:
        return _claude_caption(original_text, api_key)
    else:
        return _free_caption(original_text, source_lang)


def _claude_caption(original_text: str, api_key: str) -> str:
    """Génère une légende avec Claude - meilleure qualité."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = f"""Tu gères le compte TikTok @emorobotfrancais dédié au robot EMO de Living.ai.
Génère une légende TikTok en français (max 150 mots) pour accompagner ce contenu :

---
{original_text if original_text else "Vidéo du robot EMO de Living.ai en action"}
---

La légende doit :
- Être en français naturel et enthousiaste
- Mentionner EMO Robot
- Finir par ces hashtags exactement : {EMO_HASHTAGS}
- Être accrocheuse et adaptée à TikTok

Retourne UNIQUEMENT la légende, sans commentaire."""

        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text.strip()

    except Exception as e:
        print(f"  Erreur Claude : {e}, fallback traduction gratuite")
        return _free_caption(original_text, "en")


def _free_caption(original_text: str, source_lang: str) -> str:
    """Génère une légende en utilisant deep-translator (gratuit)."""
    global _template_index

    translated = ""
    if original_text and original_text.strip():
        try:
            from deep_translator import GoogleTranslator
            # Limite à 4500 chars pour l'API gratuite
            text_to_translate = original_text[:4500]
            translated = GoogleTranslator(source=source_lang, target="fr").translate(text_to_translate)
            # Limite à 100 mots pour TikTok
            words = translated.split()
            if len(words) > 80:
                translated = " ".join(words[:80]) + "..."
        except Exception as e:
            print(f"  Erreur traduction : {e}")

    if not translated:
        translated = "Découvrez EMO, le petit robot IA ultra-attachant de Living.ai ! 🤖❤️"

    template = CAPTION_TEMPLATES[_template_index % len(CAPTION_TEMPLATES)]
    _template_index += 1

    return template.format(text=translated, hashtags=EMO_HASHTAGS)


if __name__ == "__main__":
    test = "EMO robot is learning new tricks today! This little AI pet never stops surprising us."
    result = translate_and_caption(test)
    print("Légende générée :")
    print(result)
