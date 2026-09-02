'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.regions')}
      endpoint="/api/admin/regions"
      fields={[
        { name: "name", label: t('fields.name') },
        {
          name: "parent",
          label: t('fields.parentRegion'),
          type: "select",
          optionsEndpoint: "/api/admin/regions",
          required: false,
        },
        { name: "reimbursementAmt", label: t('fields.reimbursementPerDay'), type: "number" },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
