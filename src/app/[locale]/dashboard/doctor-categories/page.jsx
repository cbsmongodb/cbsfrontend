'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.doctorCategories')}
      endpoint="/api/doctor-categories"
      fields={[
        { name: "name", label: t('fields.name') },
        { name: "description", label: t('fields.description') },
        { name: "isActive", label: t('fields.isActive') },
      ]}
    />
  );
}
