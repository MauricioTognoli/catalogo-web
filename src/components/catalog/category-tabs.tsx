"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/catalog/ui/tabs";
import { ProductCard } from "./product-card";
import type { PublicCategory } from "@/lib/catalog/categories";
import type { PublicProductCard } from "@/lib/catalog/products";

type CategoryGroup = {
  category: PublicCategory;
  products: PublicProductCard[];
};

export function CategoryTabs({
  groups,
  heading,
}: {
  groups: CategoryGroup[];
  heading: ReactNode;
}) {
  const groupsWithProducts = groups.filter((group) => group.products.length > 0);

  if (groupsWithProducts.length === 0) {
    return null;
  }

  return (
    <Tabs defaultValue={groupsWithProducts[0].category.id} className="gap-8">
      <div className="flex flex-col gap-4 border-b border-zinc-200 md:flex-row md:items-end md:justify-between">
        <div className="md:pb-3">{heading}</div>
        <TabsList className="-mb-px w-auto flex-nowrap justify-start overflow-x-auto border-b-0 md:justify-end">
          {groupsWithProducts.map(({ category }) => (
            <TabsTrigger key={category.id} value={category.id} className="shrink-0">
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {groupsWithProducts.map(({ category, products }) => (
        <TabsContent
          key={category.id}
          value={category.id}
          className="space-y-8"
        >
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} variant="minimal" />
            ))}
          </ul>
          <div className="text-center">
            <Link
              href={`/categorias/${category.slug}`}
              className="text-sm font-medium text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Ver todo en {category.name} →
            </Link>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
