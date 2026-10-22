import os
import pytest
from unittest.mock import patch, MagicMock
from slack_notifier import send_slack_notification

def test_slack_notification_skipped_without_env():
    with patch.dict(os.environ, {}, clear=True):
        res = send_slack_notification("Test mensaje sin variable de entorno")
        assert res is False

def test_slack_notification_sent_successfully():
    with patch.dict(os.environ, {"SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/mock/test/123"}):
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.status = 200
            mock_urlopen.return_value.__enter__.return_value = mock_resp
            
            res = send_slack_notification("Nuevo producto creado", {"SKU": "SKU-999", "Stock": "50"})
            assert res is True
            assert mock_urlopen.called

def test_slack_notification_handles_failure_gracefully():
    with patch.dict(os.environ, {"SLACK_WEBHOOK_URL": "https://hooks.slack.com/services/mock/test/123"}):
        with patch("urllib.request.urlopen", side_effect=Exception("Network error")):
            res = send_slack_notification("Mensaje con red caída")
            # Debe capturar la excepción y retornar False sin levantar error fatal
            assert res is False
