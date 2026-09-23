"use client";

import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductGrid } from "./product-grid";
import type { PublicCategory } from "@/lib/catalog/categories";
import type { PublicProductCard } from "@/lib/catalog/products";

type CategoryGroup = {
  category: PublicCategory;
  products: PublicProductCard[];
};

export function CategoryTabs({ groups }: { groups: CategoryGroup[] }) {
  const groupsWithProducts = groups.filter((group) => group.products.length > 0);

  if (groupsWithProducts.length === 0) {
    return null;
  }

  return (
    <Tabs defaultValue={groupsWithProducts[0].category.id}>
      <TabsList>
        {groupsWithProducts.map(({ category }) => (
          <TabsTrigger key={category.id} value={category.id}>
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {groupsWithProducts.map(({ category, products }) => (
        <TabsContent
          key={category.id}
          value={category.id}
          className="space-y-6"
        >
          <ProductGrid products={products} />
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
