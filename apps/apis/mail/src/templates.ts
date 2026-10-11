export interface EmailContent {
    subject: string;
    text: string;
    html: string;
}

export const OTP_TTL_MINUTES = 5;

/**
 * Renders the login/registration OTP email. The OTP is always a 6-digit numeric
 * string (enforced by validation), so it is safe to interpolate.
 */
export const buildOtpEmail = (
    otp: string,
    ttlMinutes: number = OTP_TTL_MINUTES
): EmailContent => ({
    subject: "Your LCArena verification code",
    text: [
        `Your LCArena verification code is ${otp}.`,
        `It expires in ${ttlMinutes} minutes.`,
        `If you did not request this code, you can safely ignore this email.`,
    ].join("\n\n"),
    html: [
        `<p>Your LCArena verification code is:</p>`,
        `<p style="font-size:24px;letter-spacing:4px;font-weight:bold">${otp}</p>`,
        `<p>It expires in ${ttlMinutes} minutes.</p>`,
        `<p>If you did not request this code, you can safely ignore this email.</p>`,
    ].join("\n"),
});
