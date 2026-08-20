import nodemailer from "nodemailer"

interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

const createTransporter = () => {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASSWORD || "",
    },
  }

  return nodemailer.createTransport(config)
}

const createInvitationEmailHTML = (
  organizationName: string,
  inviterName: string,
  token: string
): string => {
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación a ${organizationName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
        }
        .cta-button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .cta-button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Guía</div>
        </div>
        
        <div class="content">
            <h1 class="title">¡Has sido invitado a unirte a ${organizationName}!</h1>
            
            <p>Hola,</p>
            
            <p><strong>${inviterName}</strong> te ha invitado a formar parte de la organización <strong>${organizationName}</strong> en Guía.</p>
            
            <p>Guía es una plataforma de inteligencia artificial que te permitirá chatear con documentos y obtener respuestas inteligentes basadas en el conocimiento de tu organización.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationLink}" class="cta-button">
                    Aceptar Invitación
                </a>
            </div>
            
            <div class="warning">
                <strong>Importante:</strong> Esta invitación expirará en 7 días. Si no tienes una cuenta en Guía, se te guiará para crear una.
            </div>
            
            <p>Si tienes alguna pregunta, no dudes en contactar a ${inviterName} o al equipo de soporte.</p>
        </div>
        
        <div class="footer">
            <p>Este email fue enviado automáticamente por Guía.</p>
            <p>Si no esperabas recibir esta invitación, puedes ignorar este mensaje.</p>
        </div>
    </div>
</body>
</html>
  `.trim()
}

export const sendInvitationEmail = async (
  email: string,
  token: string,
  organizationName: string,
  inviterName: string
): Promise<void> => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Invitación a unirte a ${organizationName} en Guía`,
      html: createInvitationEmailHTML(organizationName, inviterName, token),
      text: `
Has sido invitado a unirte a ${organizationName} en Guía.

${inviterName} te ha invitado a formar parte de esta organización.

Para aceptar la invitación, visita: ${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}

Esta invitación expirará en 7 días.

Si no esperabas recibir esta invitación, puedes ignorar este mensaje.
      `.trim(),
    }

    await transporter.sendMail(mailOptions)
    console.log(`Email de invitación enviado a: ${email}`)
  } catch (error) {
    console.error("Error enviando email de invitación:", error)
    throw new Error("No se pudo enviar el email de invitación")
  }
}

export const testEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log("Conexión SMTP verificada correctamente")
    return true
  } catch (error) {
    console.error("Error verificando conexión SMTP:", error)
    return false
  }
}
