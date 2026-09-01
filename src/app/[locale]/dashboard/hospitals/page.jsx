'use client'

import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";

export default function Page() {
  const t = useTranslations();

  return (
    <ResourceTable
      title={t('pages.hospitals')}
      endpoint="/api/hospitals"
      fields={[
        { name: "name", label: t('fields.name') },
        { name: "address", label: t('fields.address') },
        {
          name: "region",
          label: t('fields.region'),
          type: "select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "phoneNumber", label: t('fields.phoneNumber') },
        { name: "email", label: t('fields.email') },
        { name: "location", label: t('fields.location'), type: "location", latField: "lat", lngField: "lng" },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
      ]}
    />
  );
}
