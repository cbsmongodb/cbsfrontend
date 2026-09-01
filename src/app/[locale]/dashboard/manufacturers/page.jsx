'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.manufacturers')}
      endpoint="/api/manufacturers"
      fields={[
        { name: "name", label: t('fields.name') },
        {
          name: "producingCountry",
          label: t('fields.country'),
          type: "select",
          optionsEndpoint: "/api/producing-countries",
        },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
