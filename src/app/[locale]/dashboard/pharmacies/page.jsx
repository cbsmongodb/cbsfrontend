'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.pharmacies')}
      endpoint="/api/pharmacies"
      fields={[
        { name: "pharmacyName", label: t('fields.name') },
        { name: "address", label: t('fields.address') },
        {
          name: "region",
          label: t('fields.region'),
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "phoneNumber", label: t('fields.phoneNumber') },
        { name: "email", label: t('fields.email') },
        { name: "pharmacyCategory", label: t('fields.category') },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
