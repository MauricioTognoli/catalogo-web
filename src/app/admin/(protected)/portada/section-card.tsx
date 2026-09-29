"use client";

import { EyeOff, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Marco común de cada editor: título, motivo por el que la sección no se
 * mostraría (si aplica) y botón de guardar habilitado solo con cambios.
 */
export function SectionCard({
  title,
  description,
  hiddenReason,
  dirty,
  pending,
  onSave,
  children,
}: {
  title: string;
  description: string;
  hiddenReason?: string | null;
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
        className="flex flex-col gap-6"
      >
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {hiddenReason && (
            <CardAction>
              <Badge variant="outline" className="text-muted-foreground">
                <EyeOff aria-hidden="true" />
                No se muestra: {hiddenReason.replace(/\.$/, "").toLowerCase()}
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="grid gap-6">{children}</CardContent>
        <CardFooter className="justify-end gap-3 border-t">
          {dirty && !pending && (
            <span className="text-xs text-muted-foreground">Cambios sin guardar</span>
          )}
          <Button type="submit" disabled={!dirty || pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Guardando..." : "Guardar borrador"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
