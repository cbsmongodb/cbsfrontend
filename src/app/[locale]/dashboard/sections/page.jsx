'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.sections')}
      endpoint="/api/admin/sections"
      fields={[
        { name: "name", label: t('fields.name') },
        {
          name: "region",
          label: t('fields.region'),
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "note", label: t('fields.note') },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
