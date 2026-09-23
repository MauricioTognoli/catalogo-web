import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroBanner({
  businessName,
  imageUrl,
}: {
  businessName: string;
  imageUrl: string | null;
}) {
  return (
    <section className="relative flex min-h-[380px] items-center overflow-hidden rounded-lg bg-brand sm:min-h-[480px]">
      {imageUrl && (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
      <div
        aria-hidden="true"
        className={
          imageUrl
            ? "absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent"
            : "absolute inset-0 bg-gradient-to-br from-brand to-[#3f0e15]"
        }
      />
      <div className="relative z-10 max-w-lg px-6 py-16 text-white sm:px-12">
        <p className="text-sm tracking-[0.2em] text-white/80 uppercase">
          Nueva colección
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
          {businessName}
        </h1>
        <p className="mt-4 text-white/85">
          Piezas pensadas para acompañar cada momento.
        </p>
        <Button asChild className="mt-6 bg-white text-brand hover:bg-white/90">
          <Link href="#productos">Ver productos</Link>
        </Button>
      </div>
    </section>
  );
}
