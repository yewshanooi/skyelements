import { redirect } from "next/navigation";

export default async function SalesIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const queryString = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((item) => [k, item]) : v !== undefined ? [[k, v]] : []
    )
  ).toString();

  redirect(`/sales/table${queryString ? `?${queryString}` : ''}`);
}
