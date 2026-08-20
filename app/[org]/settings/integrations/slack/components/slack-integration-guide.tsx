"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const SlackIntegrationGuide = () => (
  <Card className="border-border/70">
    <CardHeader>
      <CardTitle>Guía paso a paso</CardTitle>
      <CardDescription>
        Sigue este flujo para configurar tu integración en Slack sin perderte ningún detalle.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="step-1">
          <AccordionTrigger>Paso 1 · Crear la integración en GUÍA</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
              <li>Elige un nombre descriptivo para el bot.</li>
              <li>Asigna categorías que delimiten qué conocimiento podrá usar.</li>
              <li>Genera el manifest y copia el JSON.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="step-2">
          <AccordionTrigger>Paso 2 · Configurar la app en Slack</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
              <li>En <strong>api.slack.com/apps</strong> selecciona "Create New App" → "From manifest".</li>
              <li>Pega el manifest generado (JSON) y revisa los scopes propuestos.</li>
              <li>Después de crear la app, instala el bot en tu workspace.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="step-3">
          <AccordionTrigger>Paso 3 · Guardar credenciales</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
              <li>Desde el panel de Slack copia el <strong>Client ID</strong>, <strong>Client Secret</strong> y el <strong>Signing Secret</strong>.</li>
              <li>En la sección OAuth &amp; Permissions copia el <strong>Bot User OAuth Token (xoxb-...)</strong>.</li>
              <li>Pega estos valores en GUÍA y guárdalos para activar la integración.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="step-4">
          <AccordionTrigger>Paso 4 · Validación y pruebas</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
              <li>Añade el bot a un canal de prueba y menciónalo con <code>@tu-bot</code>.</li>
              <li>Deberías ver primero un mensaje como "Espera, déjame pensar...".</li>
              <li>Revisa que la respuesta provenga de las categorías asignadas.</li>
              <li>Consulta la pestaña de registros para auditar el intercambio.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="step-5">
          <AccordionTrigger>Paso 5 · Sugerencias de seguridad</AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
              <li>Rota los secretos periódicamente y actualízalos en GUÍA.</li>
              <li>Usa canales privados para información sensible y añade el bot manualmente.</li>
              <li>Revisa los registros para detectar patrones inusuales.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CardContent>
  </Card>
)

