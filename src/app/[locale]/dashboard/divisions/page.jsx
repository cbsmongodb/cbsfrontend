'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.divisions')}
      endpoint="/api/divisions"
      fields={[{ name: "name", label: t('fields.name') }]}
    />
  );
}
