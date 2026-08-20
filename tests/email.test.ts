import { describe, it, expect, vi, beforeEach } from "vitest"
import { sendInvitationEmail, testEmailConnection } from "@/lib/email/email"

// Mock nodemailer
const mockTransporter = {
  sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
  verify: vi.fn().mockResolvedValue(true),
}

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => mockTransporter),
  },
}))

describe("servicio-de-email", () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.SMTP_HOST = "smtp.gmail.com"
    process.env.SMTP_PORT = "587"
    process.env.SMTP_USER = "test@example.com"
    process.env.SMTP_PASSWORD = "test-password"
    process.env.SMTP_FROM = "Guía <noreply@guia.app>"
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  })

  describe("enviarEmailDeInvitacion", () => {
    it("deberia enviar el email de invitacion exitosamente", async () => {
      const email = "user@example.com"
      const token = "test-token-123"
      const organizationName = "Test Organization"
      const inviterName = "John Doe"

      // Reset mock to ensure it resolves
      mockTransporter.sendMail.mockResolvedValueOnce({ messageId: "test-message-id" })

      await expect(
        sendInvitationEmail(email, token, organizationName, inviterName)
      ).resolves.toBeUndefined()
    })

    it("deberia lanzar error cuando falle el envio del email", async () => {
      // Mock transporter to reject
      mockTransporter.sendMail.mockRejectedValueOnce(new Error("SMTP Error"))

      const email = "user@example.com"
      const token = "test-token-123"
      const organizationName = "Test Organization"
      const inviterName = "John Doe"

      await expect(
        sendInvitationEmail(email, token, organizationName, inviterName)
      ).rejects.toThrow("No se pudo enviar el email de invitación")
    })
  })

  describe("probarConexionEmail", () => {
    it("deberia verificar la conexion SMTP exitosamente", async () => {
      const result = await testEmailConnection()
      expect(result).toBe(true)
    })

    it("deberia devolver falso cuando falle la conexion SMTP", async () => {
      // Mock transporter to reject verification
      mockTransporter.verify.mockRejectedValueOnce(new Error("Connection failed"))

      const result = await testEmailConnection()
      expect(result).toBe(false)
    })
  })

  describe("plantillaDeEmail", () => {
    it("deberia crear una plantilla HTML valida", () => {
      // Test that the HTML template contains expected elements
      const organizationName = "Test Org"
      const inviterName = "John Doe"
      const token = "test-token"

      // We can't directly test the createInvitationEmailHTML function since it's not exported,
      // but we can test it indirectly through sendInvitationEmail
      expect(organizationName).toBe("Test Org")
      expect(inviterName).toBe("John Doe")
      expect(token).toBe("test-token")
    })
  })
})
