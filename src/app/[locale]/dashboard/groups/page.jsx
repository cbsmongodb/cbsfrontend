'use client'
import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  const t = useTranslations();
  return (
    <ResourceTable
      title={t('pages.groups')}
      endpoint="/api/admin/groups"
      fields={[
        { name: "name", label: t('fields.name') },
        {
          name: "region",
          label: t('fields.region'),
          type: "searchable-select",
          optionsEndpoint: "/api/admin/regions",
        },
        {
          name: "section",
          label: t('fields.section'),
          type: "searchable-select",
          optionsEndpoint: "/api/admin/sections",
        },
        {
          name: "head",
          label: t('fields.head'),
          type: "searchable-select",
          optionsEndpoint: "/api/employees",
          optionsLabel: "name",
          required: false,
        },
        { name: "note", label: t('fields.note') },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
        {
          name: "members",
          label: t('fields.members') || "წევრები",
          type: "multiselect-search",
          optionsEndpoint: "/api/employees",
          optionsLabel: "name",
          hideInTable: true,
        },
        {
          name: "drugs",
          label: t('fields.drugs') || "პრეპარატები",
          type: "multiselect-search",
          optionsEndpoint: "/api/drugs",
          optionsLabel: "name",
          hideInTable: true,
        },
      ]}
    />
  );
}
