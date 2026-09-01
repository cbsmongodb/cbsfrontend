'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.designations')}
      endpoint="/api/admin/designations"
      fields={[
        { name: "position", label: t('fields.position') },
        { name: "isActive", label: t('fields.isActive') },
      ]}
    />
  );
}
