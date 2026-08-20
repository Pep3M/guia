import { FileText } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export interface Source {
  chunkId: string
  sourceId: string
  fileName: string
  excerpt: string
  similarity: number
}

interface SourcesAccordionProps {
  sources: Source[]
  className?: string
}

export const SourcesAccordion = ({ sources, className }: SourcesAccordionProps) => {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <Accordion type="single" collapsible>
        <AccordionItem value="sources" className="border-0">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="font-semibold">
                Fuentes utilizadas ({sources.length})
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {sources.map((source, idx) => (
                <div
                  key={`${source.chunkId}-${idx}`}
                  className="text-xs bg-background/50 p-3 rounded border border-border/40"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">
                      [{idx + 1}]
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate mb-1">
                        {source.fileName}
                      </div>
                      <div className="text-muted-foreground line-clamp-3">
                        {source.excerpt}
                      </div>
                      <div className="text-muted-foreground mt-2">
                        Similitud: {(source.similarity * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
