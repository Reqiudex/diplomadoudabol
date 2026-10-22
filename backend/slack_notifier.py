import os
import json
import logging
from typing import Optional
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

def send_slack_notification(message: str, payload_details: Optional[dict] = None) -> bool:
    """
    Envía una notificación a Slack a través de un Incoming Webhook oficial.
    - La URL del webhook se lee desde la variable de entorno SLACK_WEBHOOK_URL.
    - Falla silenciosamente para no interrumpir transacciones de base de datos si Slack está caído o no configurado.
    """
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        logger.info("SLACK_WEBHOOK_URL no configurada. Notificación omitida.")
        return False

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "📦 Ensilados & Ferretería — Notificación",
                "emoji": True
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": message
            }
        }
    ]

    if payload_details:
        fields = []
        for k, v in payload_details.items():
            fields.append({
                "type": "mrkdwn",
                "text": f"*{k}:*\n{v}"
            })
        if fields:
            blocks.append({
                "type": "section",
                "fields": fields[:10]
            })

    body = json.dumps({"blocks": blocks}).encode("utf-8")
    req = urllib.request.Request(
        webhook_url,
        data=body,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                logger.info("Notificación enviada a Slack exitosamente.")
                return True
            else:
                logger.warning(f"Slack respondió con código: {response.status}")
                return False
    except urllib.error.URLError as e:
        logger.warning(f"Error al conectar con Slack Webhook: {e}")
        return False
    except Exception as e:
        logger.warning(f"Excepción inesperada en notificación Slack: {e}")
        return False
