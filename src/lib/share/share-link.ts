export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export type SharePayload = { title: string; text: string; url: string };

export type ShareEnvironment = {
  share?: (data: SharePayload) => Promise<void>;
  canShare?: (data: SharePayload) => boolean;
  copy?: (text: string) => Promise<void>;
};

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export async function shareLink(
  { title, url }: { title: string; url: string },
  environment: ShareEnvironment,
): Promise<ShareResult> {
  const payload: SharePayload = { title, text: title, url };

  if (environment.share && (!environment.canShare || environment.canShare(payload))) {
    try {
      await environment.share(payload);
      return "shared";
    } catch (error) {
      if (isAbortError(error)) return "cancelled";
    }
  }

  if (!environment.copy) return "failed";

  return environment.copy(url).then(
    () => "copied" as const,
    () => "failed" as const,
  );
}

export function browserShareEnvironment(): ShareEnvironment {
  if (typeof navigator === "undefined") return {};

  return {
    share: typeof navigator.share === "function" ? (data) => navigator.share(data) : undefined,
    canShare:
      typeof navigator.canShare === "function" ? (data) => navigator.canShare(data) : undefined,
    copy: navigator.clipboard?.writeText
      ? (text) => navigator.clipboard.writeText(text)
      : undefined,
  };
}
