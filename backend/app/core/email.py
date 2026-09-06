"""Transactional email via Resend's HTTP API (https://resend.com/docs/api-reference).

No SDK — just one POST. If RESEND_API_KEY is blank (local dev) we log the message
to the console instead of sending, so the whole auth flow works offline.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("app.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def _send(*, to: str, subject: str, html: str) -> None:
    sender = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"

    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY not set — email NOT sent.\n  to: %s\n  subject: %s\n  %s",
            to,
            subject,
            html,
        )
        return

    resp = httpx.post(
        RESEND_ENDPOINT,
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={"from": sender, "to": [to], "subject": subject, "html": html},
        timeout=10.0,
    )
    if resp.status_code >= 400:
        # Don't leak provider internals to the API caller; log for us.
        logger.error("Resend error %s: %s", resp.status_code, resp.text)
        raise RuntimeError("Failed to send email")


def send_otp_email(*, to: str, code: str, purpose: str) -> None:
    if purpose == "email_verification":
        subject = "Verify your FitTrack account"
        line = "Use this code to finish creating your trainer account:"
    else:  # password_reset
        subject = "Reset your FitTrack password"
        line = "Use this code to reset your password:"

    html = f"""
    <div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto">
      <h2 style="color:#0b2545">FitTrack</h2>
      <p>{line}</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#0b2545">{code}</p>
      <p style="color:#64748b;font-size:14px">
        This code expires in {settings.OTP_EXPIRE_MINUTES} minutes. If you didn't
        request it, you can ignore this email.
      </p>
    </div>
    """
    _send(to=to, subject=subject, html=html)
