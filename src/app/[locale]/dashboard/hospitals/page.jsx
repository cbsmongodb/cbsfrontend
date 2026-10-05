'use client'
import { useTranslations } from "next-intl";
import ResourceTable from "@/components/ResourceTable/ResourceTable";
export default function Page() {
  const t = useTranslations();
  return (
    <ResourceTable
      title={t('pages.hospitals')}
      endpoint="/api/hospitals"
      paginated
      pageSize={100}
      fields={[
        { name: "name", label: t('fields.name') },
        { name: "address", label: t('fields.address'), required: false },
        {
          name: "region",
          label: t('fields.region'),
          type: "searchable-select",
          optionsEndpoint: "/api/admin/regions",
        },
        { name: "phoneNumber", label: t('fields.phoneNumber'), required: false },
        { name: "email", label: t('fields.email'), required: false },
        { name: "location", label: t('fields.location'), type: "location", latField: "lat", lngField: "lng" },
        { name: "isActive", label: t('fields.isActive'), type: "checkbox" },
        { name: "doctors", label: "ექიმები", type: "hospital-doctors", hideInTable: true },
      ]}
    />
  );
}
