import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { TextAnimate } from "@/components/ui/text-animate"

const faqs = [
  {
    question: "¿Cómo funciona el acceso a la información en GUIA?",
    answer:
      "GUIA organiza tu información por organización y por categorías. Cada grupo de personas ve sólo las categorías que le has asignado, y ese filtro se aplica en la propia búsqueda: una respuesta nunca puede apoyarse en un documento al que quien pregunta no tiene acceso.",
  },
  {
    question: "¿Dónde quedan mis datos?",
    answer:
      "Donde tú decidas. GUIA está pensado para instalarse en tu propia infraestructura: base de datos, archivos y modelos de lenguaje pueden ejecutarse íntegramente en tus servidores, sin que ningún documento salga de tu red. También puedes apuntarlo a un proveedor externo de modelos si lo prefieres.",
  },
  {
    question: "¿Qué formatos de archivo soporta?",
    answer:
      "Actualmente PDF, TXT y Markdown. El texto se extrae, se divide en fragmentos y se indexa para que las respuestas puedan citar el documento de origen.",
  },
  {
    question: "¿Puedo integrarlo con las herramientas de mi equipo?",
    answer:
      "Sí. Hay una integración con Slack para que se pueda preguntar desde donde el equipo ya trabaja, respetando los mismos permisos de categoría que en la aplicación web.",
  },
  {
    question: "¿Es software libre?",
    answer:
      "Sí, GUIA se publica bajo licencia AGPL-3.0: puedes instalarlo, auditarlo y modificarlo sin coste. Si necesitas una licencia comercial, o ayuda con la instalación y el mantenimiento del servidor, ese es el servicio que ofrecemos aparte.",
  },
  {
    question: "¿Qué tan precisas son las respuestas?",
    answer:
      "Las respuestas se basan directamente en tus documentos, no en información genérica, y siempre se incluyen citas a las fuentes para que puedas verificar. La precisión depende también del modelo que configures: cuanto mayor el modelo, mejor la redacción y el razonamiento.",
  },
]


export function LandingFAQ() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-32">
      <div className="container px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-4 text-balance">
            <TextAnimate animation="fadeIn">Preguntas Frecuentes</TextAnimate>
          </h2>
          <TextAnimate animation="fadeIn" delay={0.4} className="text-lg text-muted-foreground text-pretty">
            Todo lo que necesitas saber sobre GUIA. ¿No encuentras lo que buscas? Abre una issue en el repositorio.
          </TextAnimate>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg font-semibold">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-pretty">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
