"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STOREFRONT_SECTIONS, type StorefrontSectionKey } from "./storefront-sections";

/**
 * Un editor por pestaña, para no tener un formulario gigante. La pestaña
 * queda en la URL (?seccion=) sin pedirle nada al servidor, así recargar
 * o volver de la vista previa mantiene el lugar.
 */
export function StorefrontTabs({
  initialSection,
  panels,
}: {
  initialSection: StorefrontSectionKey;
  panels: Record<StorefrontSectionKey, React.ReactNode>;
}) {
  const [section, setSection] = useState(initialSection);

  return (
    <Tabs
      value={section}
      onValueChange={(value) => {
        setSection(value as StorefrontSectionKey);
        window.history.replaceState(null, "", `?seccion=${value}`);
      }}
      className="gap-4"
    >
      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList>
          {STOREFRONT_SECTIONS.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="px-3">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {STOREFRONT_SECTIONS.map((item) => (
        // forceMount: cada editor conserva lo que se está escribiendo al
        // cambiar de pestaña.
        <TabsContent
          key={item.value}
          value={item.value}
          forceMount
          className="data-[state=inactive]:hidden"
        >
          {panels[item.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
