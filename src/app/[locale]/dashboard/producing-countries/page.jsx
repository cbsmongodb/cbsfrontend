'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.producingCountries')}
      endpoint="/api/producing-countries"
      fields={[
        { name: "name", label: t('fields.name') },
        { name: "isActive", label: t('fields.isActive') },
      ]}
    />
  );
}
