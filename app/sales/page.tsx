import { redirect } from "next/navigation";

export default async function SalesIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(sp || {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) entries.push([key, item]);
      }
    } else if (value) {
      entries.push([key, value]);
    }
  }

  const queryString = new URLSearchParams(entries).toString();
  redirect(`/sales/table${queryString ? `?${queryString}` : ''}`);
}
