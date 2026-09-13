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
          name: "head",
          label: t('fields.head'),
          type: "searchable-select",
          optionsEndpoint: "/api/employees",
          required: false,
        },
        {
          name: "region",
          label: t('fields.region'),
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        {
          name: "groups",
          label: t('fields.groups'),
          type: "multiselect-search",
          optionsEndpoint: "/api/admin/groups",
          required: false,
        },
        { name: "note", label: t('fields.note'), required: false },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
